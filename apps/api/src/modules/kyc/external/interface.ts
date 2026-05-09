export interface KycProvider {
  verify(): Promise<{ success: boolean; message: string }>;
}
