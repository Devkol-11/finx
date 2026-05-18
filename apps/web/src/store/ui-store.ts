import { create } from "zustand";
import type { Transaction } from "@/types/api";

type TransferDraft = {
  finxTag: string;
  amount: string;
  narration?: string;
};

type UiState = {
  selectedTransaction: Transaction | null;
  transferDraft: TransferDraft | null;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  setTransferDraft: (draft: TransferDraft | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedTransaction: null,
  transferDraft: null,
  setSelectedTransaction: (selectedTransaction) => set({ selectedTransaction }),
  setTransferDraft: (transferDraft) => set({ transferDraft }),
}));
