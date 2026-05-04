import { LogIn } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="email" placeholder="admin@example.com" />
          <Input type="password" placeholder="Password" />
          <Button className="w-full">
            <LogIn size={16} aria-hidden />
            Sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
