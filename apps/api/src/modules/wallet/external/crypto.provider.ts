import type {
  BlockchainBalanceResult,
  IBlockchainProvider,
  SendAssetsPayload,
  SendAssetsResult,
} from "./interfaces/IBlockchainProvider";

/**
 * Placeholder crypto provider for future EVM integrations.
 */
export class CryptoProvider implements IBlockchainProvider {
  public async sendAssets(_payload: SendAssetsPayload): Promise<SendAssetsResult> {
    return {
      txHash: "pending-crypto-integration",
      status: "pending",
    };
  }

  public async getWalletBalance(_address: string, asset: string): Promise<BlockchainBalanceResult> {
    return {
      asset,
      balance: "0",
    };
  }
}
