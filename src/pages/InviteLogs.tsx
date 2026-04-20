import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell,
} from "@/components/ui/table";
import { Send, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type Invite = {
  id: string;
  complexName: string;
  phone: string;
  status: string;
  method: string;
  errorMessage: string | null;
  sentBy: string | null;
  sentAt: string;
};

const InviteLogs = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getInvites();
      setInvites(data);
    } catch (e) {
      console.error("초대 내역 조회 실패", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const todayCount = invites.filter((i) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(i.sentAt) >= today;
  }).length;
  const successCount = invites.filter((i) => i.status === "SUCCESS").length;
  const failCount = invites.filter((i) => i.status === "FAILED").length;

  const stats = [
    { label: "오늘 발송", value: todayCount, icon: Send, bg: "hsl(213, 50%, 24%)" },
    { label: "성공", value: successCount, icon: CheckCircle2, bg: "hsl(150, 50%, 35%)" },
    { label: "실패", value: failCount, icon: XCircle, bg: "hsl(0, 70%, 50%)" },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    const last4 = phone.slice(-4);
    return `****-${last4}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">초대 발송 내역</h1>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 md:p-6 flex items-center gap-3 md:gap-4">
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <s.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-xs md:text-sm text-muted-foreground truncate">{s.label}</div>
                <div className="text-xl md:text-2xl font-bold">{s.value}건</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">발송 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발송일시</TableHead>
                  <TableHead>단지</TableHead>
                  <TableHead>수신번호</TableHead>
                  <TableHead>방식</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>발송자</TableHead>
                  <TableHead>오류</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      발송 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(i.sentAt)}</TableCell>
                      <TableCell>{i.complexName}</TableCell>
                      <TableCell className="font-mono">{maskPhone(i.phone)}</TableCell>
                      <TableCell>{i.method}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "SUCCESS" ? "default" : "destructive"}>
                          {i.status === "SUCCESS" ? "성공" : "실패"}
                        </Badge>
                      </TableCell>
                      <TableCell>{i.sentBy || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {i.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteLogs;
