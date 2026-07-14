"use client";

import { Coffee, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Welcome() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="stagger-item w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Woura</CardTitle>
          <CardDescription className="text-balance">
            Your Oura data, on your terms. Long-term trends, correlations, and
            clean exports — everything stays in your browser. No servers, no
            tracking, no AI. Open source.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild size="lg">
            <a href="/api/auth/login">
              <Lock data-icon="inline-start" /> Authorize with Oura
            </a>
          </Button>
          <Button asChild variant="ghost">
            <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer">
              <Coffee data-icon="inline-start" /> Buy me a coffee
            </a>
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground text-pretty">
            You&apos;ll be redirected to Oura to grant access. The token lives only in this browser.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
