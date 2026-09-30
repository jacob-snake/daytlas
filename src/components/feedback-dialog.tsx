"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FeedbackDialog() {
  const [topic, setTopic] = useState("Feedback");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <MessageSquare className="size-4" aria-hidden="true" />
          Send us feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Help shape what comes next.</DialogTitle>
          <DialogDescription>
            Tell us what worked, what felt confusing, or what you’d like to see.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams({
              subject: `Me by Day · ${topic}`,
              body: message.trim(),
            });
            window.location.href = `mailto:hadjkb@gmail.com?${params.toString().replaceAll("+", "%20")}`;
            setDraft(true);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="feedback-topic">What’s on your mind?</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger id="feedback-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Feedback", "Something isn’t working", "Feature idea"].map(
                  (value) => (
                    <SelectItem value={value} key={value}>
                      {value}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setDraft(false);
              }}
              required
              minLength={10}
              maxLength={1500}
              rows={5}
              placeholder="I noticed…"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Opens a draft to hadjkb@gmail.com in your email app. Only your
            message is included; nothing is sent automatically.
          </p>
          <Button type="submit">Open email to send</Button>
          {draft && (
            <p role="status" className="text-sm text-muted-foreground">
              Send the draft from your email app. If it did not open, email your
              message to hadjkb@gmail.com.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
