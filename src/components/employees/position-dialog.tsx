"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCafe } from "@/lib/store/cafe-context";
import type { PositionItem } from "@/types";
import { Plus, Pencil, Trash2, AlertCircle, Check } from "lucide-react";

// ============================================================
// Dialog Tambah Jabatan
// ============================================================

interface AddPositionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newPosition: PositionItem) => void;
}

export function AddPositionDialog({
  open,
  onClose,
  onSuccess,
}: AddPositionDialogProps) {
  const { addPosition } = useCafe();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama jabatan tidak boleh kosong");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await addPosition(name.trim());
      if (res.success && res.data) {
        setName("");
        setError("");
        onClose();
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setError(res.error || "Gagal menambahkan jabatan.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menyimpan jabatan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Jabatan Baru</DialogTitle>
          <DialogDescription>
            Masukkan nama jabatan atau posisi karyawan baru.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="pos-name-input" className="text-sm font-medium text-stone-700">
              Nama Jabatan <span className="text-red-500">*</span>
            </label>
            <Input
              id="pos-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="cth: Barista, Kasir, Waiter..."
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setName("");
                setError("");
                onClose();
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? "Menyimpan..." : "Tambah Jabatan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Dialog Kelola Jabatan
// ============================================================

interface ManagePositionDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenAdd?: () => void;
}

export function ManagePositionDialog({
  open,
  onClose,
  onOpenAdd,
}: ManagePositionDialogProps) {
  const { positions, updatePosition, deletePosition, employees } = useCafe();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PositionItem | null>(null);
  const [deleteWarning, setDeleteWarning] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleStartEdit = (pos: PositionItem) => {
    setEditingId(pos.id);
    setEditName(pos.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (editName.trim()) {
      setActionLoading(true);
      const res = await updatePosition(id, editName.trim());
      setActionLoading(false);
      if (!res.success) {
        alert(res.error || "Gagal mengubah nama jabatan.");
      }
    }
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    const res = await deletePosition(deleteTarget.id);
    setActionLoading(false);
    if (!res.success) {
      setDeleteWarning(
        res.message || `Jabatan ini sedang digunakan oleh ${res.inUseCount} karyawan. Tidak dapat dihapus.`
      );
      return;
    }
    setDeleteTarget(null);
    setDeleteWarning("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle>Kelola Jabatan</DialogTitle>
                <DialogDescription>
                  Daftar seluruh jabatan dan peran karyawan cafe.
                </DialogDescription>
              </div>
              {onOpenAdd && (
                <Button
                  size="sm"
                  variant="brand"
                  className="gap-1.5 text-xs shrink-0"
                  onClick={() => {
                    onClose();
                    onOpenAdd();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[50vh] pr-1">
            {positions.length === 0 ? (
              <p className="text-center py-6 text-sm text-[var(--muted-foreground)]">
                Belum ada data jabatan.
              </p>
            ) : (
              positions.map((pos) => {
                const isEditing = editingId === pos.id;
                const inUseCount = employees.filter(
                  (e) =>
                    e.position?.toUpperCase() === pos.code?.toUpperCase() ||
                    e.position?.toLowerCase() === pos.name?.toLowerCase()
                ).length;

                return (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-white hover:bg-stone-50/70 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          disabled={actionLoading}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(pos.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="brand"
                          className="h-8 px-2.5"
                          disabled={actionLoading}
                          onClick={() => handleSaveEdit(pos.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5"
                          disabled={actionLoading}
                          onClick={() => setEditingId(null)}
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full bg-brand-500 shrink-0" />
                          <div>
                            <p className="font-medium text-stone-800 text-sm truncate">
                              {pos.name}
                            </p>
                            {inUseCount > 0 && (
                              <p className="text-[11px] text-[var(--muted-foreground)]">
                                {inUseCount} karyawan aktif
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 text-stone-600 hover:text-stone-900"
                            onClick={() => handleStartEdit(pos)}
                            title="Edit nama jabatan"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeleteWarning("");
                              setDeleteTarget(pos);
                            }}
                            title="Hapus jabatan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      {deleteTarget && (
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) {
              setDeleteTarget(null);
              setDeleteWarning("");
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Hapus Jabatan?
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus jabatan &quot;{deleteTarget.name}&quot;?
              </DialogDescription>
            </DialogHeader>

            {deleteWarning && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteWarning}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteWarning("");
                }}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
              >
                {actionLoading ? "Menghapus..." : "Hapus"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
