import torch
import torch.nn as nn

class SaleProfilerLSTM(nn.Module):
    """
    게임 ID, 개발사 ID, 배급사 ID를 위한 별도의 임베딩 레이어를 포함한 LSTM 모델.
    """
    def __init__(self, num_games: int, num_devs: int, num_pubs: int, params: dict):
        super().__init__()
        
        # 각 ID에 대한 임베딩 레이어
        self.game_embedding = nn.Embedding(num_embeddings=num_games, embedding_dim=params['game_embedding_dim'])
        self.dev_embedding = nn.Embedding(num_embeddings=num_devs, embedding_dim=params['dev_embedding_dim'])
        self.publisher_embedding = nn.Embedding(num_embeddings=num_pubs, embedding_dim=params['pub_embedding_dim'])
        
        # 모든 임베딩 벡터와 입력 특징을 합친 크기
        combined_input_size = (params['input_size'] + 
                               params['game_embedding_dim'] + 
                               params['dev_embedding_dim'] + 
                               params['pub_embedding_dim'])
        
        self.lstm = nn.LSTM(
            input_size=combined_input_size, 
            hidden_size=params['hidden_layer_size'], 
            num_layers=params['num_layers'], 
            batch_first=True, 
            dropout=params['dropout']
        )
        self.linear = nn.Linear(params['hidden_layer_size'], 1)

    def forward(self, input_seq, game_ids, dev_ids, pub_ids):
        # 각 ID에 대한 임베딩 벡터 생성
        game_embeds = self.game_embedding(game_ids.squeeze(-1))
        dev_embeds = self.dev_embedding(dev_ids.squeeze(-1))
        pub_embeds = self.publisher_embedding(pub_ids.squeeze(-1))
        
        # 임베딩 벡터들을 시퀀스 길이에 맞게 확장
        seq_length = input_seq.size(1)
        game_embeds_expanded = game_embeds.unsqueeze(1).expand(-1, seq_length, -1)
        dev_embeds_expanded = dev_embeds.unsqueeze(1).expand(-1, seq_length, -1)
        pub_embeds_expanded = pub_embeds.unsqueeze(1).expand(-1, seq_length, -1)
        
        # 입력 특징과 모든 임베딩 벡터를 결합
        combined_input = torch.cat([
            input_seq, 
            game_embeds_expanded, 
            dev_embeds_expanded, 
            pub_embeds_expanded
        ], dim=2)
        
        lstm_out, _ = self.lstm(combined_input)
        
        # 마지막 타임스텝의 출력만 사용
        return self.linear(lstm_out[:, -1, :])