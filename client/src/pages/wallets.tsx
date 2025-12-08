import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Wallet as WalletType, InsertWallet } from "@shared/schema";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Wallets() {
  const { isAuthenticated, setShowLoginModal } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [deletingWallet, setDeletingWallet] = useState<WalletType | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [formData, setFormData] = useState<InsertWallet>({
    name: "",
    address: "",
  });

  const { data: wallets, isLoading } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertWallet) => apiRequest("POST", "/api/wallets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet created successfully" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Failed to create wallet", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InsertWallet }) =>
      apiRequest("PATCH", `/api/wallets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet updated successfully" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Failed to update wallet", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/wallets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Wallet deleted successfully" });
      setIsDeleteOpen(false);
      setDeletingWallet(null);
    },
    onError: () => {
      toast({ title: "Failed to delete wallet", variant: "destructive" });
    },
  });

  const openCreateModal = () => {
    setEditingWallet(null);
    setFormData({ name: "", address: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (wallet: WalletType) => {
    setEditingWallet(wallet);
    setFormData({ name: wallet.name, address: wallet.address });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWallet(null);
    setFormData({ name: "", address: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWallet) {
      updateMutation.mutate({ id: editingWallet.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyAddress = async (address: string, id: number) => {
    await navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="glass max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Login Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your wallet registry.
            </p>
            <Button
              onClick={() => setShowLoginModal(true)}
              className="bg-gradient-to-r from-purple-500 to-cyan-500"
              data-testid="button-login-prompt"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Wallet Name",
      sortable: true,
      render: (wallet: WalletType) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-medium">{wallet.name}</span>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (wallet: WalletType) => (
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm bg-muted/50 px-2 py-1 rounded">
            {shortenAddress(wallet.address)}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => copyAddress(wallet.address, wallet.id)}
            data-testid={`button-copy-${wallet.id}`}
          >
            {copiedId === wallet.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            asChild
          >
            <a
              href={`https://etherscan.io/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-explorer-${wallet.id}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (wallet: WalletType) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditModal(wallet)}
            data-testid={`button-edit-${wallet.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDeletingWallet(wallet);
              setIsDeleteOpen(true);
            }}
            data-testid={`button-delete-${wallet.id}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Wallet Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your cryptocurrency wallets
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="gap-2 bg-gradient-to-r from-purple-500 to-cyan-500"
          data-testid="button-add-wallet"
        >
          <Plus className="w-4 h-4" />
          Add Wallet
        </Button>
      </div>

      <Card className="glass overflow-visible">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Your Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : wallets && wallets.length > 0 ? (
            <DataTable
              data={wallets}
              columns={columns}
              searchKey="name"
              searchPlaceholder="Search wallets..."
              emptyMessage="No wallets found"
              testId="table-wallets"
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No wallets added yet</p>
              <p className="text-sm">Click "Add Wallet" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>
              {editingWallet ? "Edit Wallet" : "Add New Wallet"}
            </DialogTitle>
            <DialogDescription>
              {editingWallet
                ? "Update your wallet information"
                : "Add a new wallet to your registry"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-name">Wallet Name</Label>
              <Input
                id="wallet-name"
                placeholder="e.g., Main Trading Wallet"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                data-testid="input-wallet-name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x..."
                className="font-mono"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                data-testid="input-wallet-address"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-wallet"
              >
                {editingWallet ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingWallet?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingWallet && deleteMutation.mutate(deletingWallet.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
