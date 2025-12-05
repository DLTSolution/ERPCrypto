import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-6">
      <Card className="glass max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold gradient-text">404</h1>
            <h2 className="text-xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-500 to-cyan-500"
          >
            <Link href="/market">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
