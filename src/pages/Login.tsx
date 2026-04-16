import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn } from "lucide-react";

const Login = () => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(id, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(213, 50%, 20%), hsl(213, 50%, 30%))" }}>
      <Card className="w-full max-w-md mx-4 shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "hsl(213, 50%, 24%)" }}>
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">입주ON 관리자</CardTitle>
          <p className="text-sm text-muted-foreground">관리자 계정으로 로그인해주세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="loginId">아이디</Label>
              <Input
                id="loginId"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginPw">비밀번호</Label>
              <Input
                id="loginPw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" style={{ backgroundColor: "hsl(213, 50%, 24%)" }}>
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
