import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";

interface NameVerificationProps {
  onVerify: (name: string) => void;
  pendingMessage: string;
}

export const NameVerification = ({ onVerify, pendingMessage }: NameVerificationProps) => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerify(name.trim());
  };

  return (
    <div className="p-4 bg-muted rounded-lg border border-border">
      <div className="flex items-start gap-3 mb-4">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="font-medium text-sm">Identity Verification Required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please enter your name to continue with this request.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          className="flex-1"
          autoFocus
        />
        <Button type="submit" disabled={!name.trim()}>
          Verify
        </Button>
      </form>
    </div>
  );
};
