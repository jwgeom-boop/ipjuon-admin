import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";

interface Notice {
  id: string;
  category: string;
  title: string;
  content: string;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ["대출정보", "제휴소식", "서비스안내"];
const ALL_CATEGORIES = ["전체", ...CATEGORIES];

type DateRange = "all" | "today" | "week" | "month";

const categoryColor: Record<string, string> = {
  "대출정보": "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100",
  "제휴소식": "border-transparent bg-green-100 text-green-700 hover:bg-green-100",
  "서비스안내": "border-transparent bg-orange-100 text-orange-700 hover:bg-orange-100",
};

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ category: "대출정보", title: "", content: "", pinned: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getNotices();
      setNotices(data ?? []);
    } catch { toast.error("데이터를 불러오는데 실패했습니다."); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let result = notices;
    if (categoryFilter !== "전체") result = result.filter((n) => n.category === categoryFilter);

    if (dateRange !== "all") {
      const now = new Date();
      let start: Date;
      if (dateRange === "today") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      else if (dateRange === "week") { start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
      else start = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((n) => new Date(n.created_at) >= start);
    }

    return result;
  }, [notices, categoryFilter, dateRange]);

  const openAddModal = () => {
    setEditNotice(null);
    setForm({ category: "대출정보", title: "", content: "", pinned: false });
    setModalOpen(true);
  };

  const openEditModal = (n: Notice) => {
    setEditNotice(n);
    setForm({ category: n.category, title: n.title, content: n.content, pinned: n.pinned });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) { toast.error("제목과 내용을 입력해주세요."); return; }
    setSaving(true);

    try {
      if (editNotice) {
        await api.updateNotice(editNotice.id, { category: form.category, title: form.title, content: form.content, pinned: form.pinned });
        toast.success("공지가 수정되었습니다.");
      } else {
        await api.createNotice({ category: form.category, title: form.title, content: form.content, pinned: form.pinned, viewCount: 0 });
        toast.success("공지가 작성되었습니다.");
      }
      setModalOpen(false); fetchData();
    } catch { toast.error("저장에 실패했습니다."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteNotice(deleteTarget.id);
      toast.success("공지가 삭제되었습니다.");
      fetchData();
    } catch { toast.error("삭제에 실패했습니다."); }
    setDeleteTarget(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">공지사항 관리</h1>
        <Button onClick={openAddModal} className="gap-2">
          <Plus className="h-4 w-4" />
          공지 작성
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(["all", "today", "week", "month"] as DateRange[]).map((range) => (
            <Button key={range} variant={dateRange === range ? "default" : "outline"} size="sm" onClick={() => setDateRange(range)}>
              {{ all: "전체기간", today: "오늘", week: "이번주", month: "이번달" }[range]}
            </Button>
          ))}
        </div>

        <span className="ml-auto text-sm text-muted-foreground">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">번호</TableHead>
              <TableHead className="w-28">카테고리</TableHead>
              <TableHead>제목</TableHead>
              <TableHead className="w-28">작성일</TableHead>
              <TableHead className="w-20">조회수</TableHead>
              <TableHead className="w-28">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">로딩 중...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>
            ) : (
              filtered.map((n, idx) => (
                <TableRow key={n.id} className={n.pinned ? "bg-red-50/50" : ""}>
                  <TableCell className="font-medium">{filtered.length - idx}</TableCell>
                  <TableCell>
                    <Badge className={categoryColor[n.category] || ""}>{n.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {n.pinned && (
                        <Badge className="border-transparent bg-red-100 text-red-600 hover:bg-red-100 gap-1">
                          <Pin className="h-3 w-3" />
                          중요
                        </Badge>
                      )}
                      <span>{n.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(n.created_at)}</TableCell>
                  <TableCell>{n.view_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(n)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(n)} className="text-destructive hover:text-destructive">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editNotice ? "공지 수정" : "공지 작성"}</DialogTitle>
            <DialogDescription>{editNotice ? "공지사항을 수정합니다." : "새로운 공지사항을 작성합니다."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="공지 제목" />
            </div>
            <div className="space-y-2">
              <Label>내용 *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="공지 내용을 입력하세요..." rows={6} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pinned"
                checked={form.pinned}
                onCheckedChange={(checked) => setForm({ ...form, is_pinned: !!checked })}
              />
              <Label htmlFor="pinned" className="cursor-pointer">중요 공지 (상단 고정)</Label>
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
            <AlertDialogTitle>공지 삭제</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
