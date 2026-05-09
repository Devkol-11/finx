export interface SendAssetsPayload {
  asset: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
}

export interface SendAssetsResult {
  txHash: string;
  status: 'success' | 'failed' | 'pending';
}

export interface BlockchainBalanceResult {
  asset: string;
  balance: string;
}

export interface IBlockchainProvider {
  sendAssets(payload: SendAssetsPayload): Promise<SendAssetsResult>;
  getWalletBalance(address: string, asset: string): Promise<BlockchainBalanceResult>;
}
