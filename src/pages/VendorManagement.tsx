import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Vendor {
  id: string;
  vendorName: string;
  vendorType: string;
  loginId: string;
  password: string;
  phone: string;
  status: string;
  createdAt: string;
}

const VENDOR_TYPES = ["인테리어", "이사", "인터넷·TV", "청소", "가구", "가전", "은행"];
const ALL_TYPES = ["전체", ...VENDOR_TYPES];

type StatusFilter = "all" | "active" | "inactive";

const VendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ vendor_name: "", vendor_type: "인테리어", login_id: "", password: "", phone: "" });
  const [resetPassword, setResetPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await api.getVendors();
      setVendors(data || []);
    } catch { toast.error("데이터 로딩 실패"); }
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, []);

  const filtered = useMemo(() => {
    let result = vendors;
    if (typeFilter !== "전체") result = result.filter((v) => v.vendorType === typeFilter);
    if (statusFilter === "active") result = result.filter((v) => v.status === "active");
    if (statusFilter === "inactive") result = result.filter((v) => v.status === "inactive");
    return result;
  }, [vendors, typeFilter, statusFilter]);

  const openAddModal = () => {
    setEditVendor(null);
    setForm({ vendor_name: "", vendor_type: "인테리어", login_id: "", password: "", phone: "" });
    setResetPassword("");
    setModalOpen(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditVendor(v);
    setForm({ vendor_name: v.vendorName, vendor_type: v.vendorType, login_id: v.loginId, password: "", phone: v.phone });

    setResetPassword("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vendor_name || !form.phone) { toast.error("필수 항목을 입력해주세요."); return; }
    setSaving(true);

    try {
      if (editVendor) {
        await api.updateVendor(editVendor.id, { vendorName: form.vendor_name, vendorType: form.vendor_type, phone: form.phone, password: resetPassword || undefined });
        toast.success("업체 정보가 수정되었습니다.");
      } else {
        if (!form.login_id || !form.password) { toast.error("아이디와 비밀번호를 입력해주세요."); setSaving(false); return; }
        await api.createVendor({ vendorName: form.vendor_name, vendorType: form.vendor_type, loginId: form.login_id, password: form.password, phone: form.phone, status: "active" });
        toast.success("업체가 추가되었습니다.");
      }
      setModalOpen(false); fetchVendors();
    } catch { toast.error("저장 실패"); }
    setSaving(false);
  };

  const toggleStatus = async (v: Vendor) => {
    const newStatus = v.status === "active" ? "inactive" : "active";
    try {
      await api.toggleVendorStatus(v.id, newStatus);
      fetchVendors();
    } catch { toast.error("상태 변경 실패"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteVendor(deleteTarget.id);
      toast.success("업체가 삭제되었습니다.");
      fetchVendors();
    } catch { toast.error("삭제 실패"); }
    setDeleteTarget(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">업체 계정 관리</h1>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="h-4 w-4" />
          업체 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="active">활성</TabsTrigger>
            <TabsTrigger value="inactive">비활성</TabsTrigger>
          </TabsList>
        </Tabs>

        <span className="ml-auto text-sm text-muted-foreground">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">번호</TableHead>
              <TableHead>업체명</TableHead>
              <TableHead>업체유형</TableHead>
              <TableHead>로그인 아이디</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>등록일</TableHead>
              <TableHead className="w-32">상태</TableHead>
              <TableHead className="w-28">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">로딩 중...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">데이터가 없습니다.</TableCell>
              </TableRow>
            ) : (
              filtered.map((v, i) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{filtered.length - i}</TableCell>
                  <TableCell>{v.vendorName}</TableCell>
                  <TableCell>{v.vendorType}</TableCell>
                  <TableCell>{v.loginId}</TableCell>
                  <TableCell>{v.phone}</TableCell>
                  <TableCell>{formatDate(v.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={v.status === "active"} onCheckedChange={() => toggleStatus(v)} />
                      <Badge
                        className={
                          v.status === "active"
                            ? "border-transparent bg-green-100 text-green-700 hover:bg-green-100"
                            : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-100"
                        }
                      >
                        {v.status === "active" ? "활성" : "비활성"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(v)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(v)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editVendor ? "업체 수정" : "업체 추가"}</DialogTitle>
            <DialogDescription>{editVendor ? "업체 정보를 수정합니다." : "새로운 업체 계정을 추가합니다."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>업체명 *</Label>
              <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="업체명" />
            </div>
            <div className="space-y-2">
              <Label>업체유형</Label>
              <Select value={form.vendor_type} onValueChange={(v) => setForm({ ...form, vendor_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VENDOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editVendor && (
              <>
                <div className="space-y-2">
                  <Label>로그인 아이디 *</Label>
                  <Input value={form.login_id} onChange={(e) => setForm({ ...form, login_id: e.target.value })} placeholder="로그인 아이디" />
                </div>
                <div className="space-y-2">
                  <Label>임시 비밀번호 *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="임시 비밀번호" />
                </div>
              </>
            )}
            {editVendor && (
              <div className="space-y-2">
                <Label>비밀번호 초기화 (입력 시 변경)</Label>
                <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="새 임시 비밀번호" />
              </div>
            )}
            <div className="space-y-2">
              <Label>연락처 *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>업체 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.vendor_name}" 업체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorManagement;
