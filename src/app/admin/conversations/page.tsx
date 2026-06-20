"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Phone, Filter } from "lucide-react";

const OUTCOMES = [
  { value: "all", label: "All Outcomes" },
  { value: "booked", label: "Booked" },
  { value: "roadmap_requested", label: "Roadmap Requested" },
  { value: "free_tools", label: "Free Tools" },
  { value: "low_intent", label: "Low Intent" },
  { value: "abandoned", label: "Abandoned" },
  { value: "error", label: "Error" },
] as const;

const ROADMAP_STATUSES = [
  { value: "all", label: "All Roadmap Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "sent", label: "Sent" },
] as const;

const getOutcomeColor = (outcome: string | undefined) => {
  switch (outcome) {
    case "booked":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "roadmap_requested":
      return "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20";
    case "free_tools":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "low_intent":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    case "abandoned":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "error":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  }
};

const getScoreColor = (score: number | undefined) => {
  if (!score) return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  if (score >= 4) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (score >= 3) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  if (score >= 2) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
};

const getRoadmapStatusColor = (status: string | undefined) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "in_progress":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "sent":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "";
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds: number | undefined) => {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

export default function AdminConversationsPage() {
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [roadmapFilter, setRoadmapFilter] = useState("all");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);

  const conversations = useQuery(api.conversations.listConversations, {
    outcome: outcomeFilter !== "all" ? outcomeFilter : undefined,
    roadmapStatus: roadmapFilter !== "all" ? roadmapFilter : undefined,
  });

  const selectedConversation = useQuery(
    api.conversations.getConversation,
    selectedConversationId ? { conversationId: selectedConversationId } : "skip"
  );

  const updateRoadmapStatus = useMutation(api.conversations.updateRoadmapStatus);

  const handleRowClick = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setIsDetailDialogOpen(true);
  };

  const handleRoadmapStatus = async (conversationId: Id<"conversations">, status: string) => {
    try {
      await updateRoadmapStatus({ conversationId, status });
    } catch (error) {
      console.error("Failed to update roadmap status:", error);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h1 font-bold text-text-primary">Conversations</h1>
          <p className="mt-2 text-text-muted">
            View AI agent conversations, transcripts, and outcomes
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-4">
          <Filter className="h-4 w-4 text-text-muted" />
          <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v); setRoadmapFilter("all"); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roadmapFilter} onValueChange={(v) => { setRoadmapFilter(v); setOutcomeFilter("all"); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROADMAP_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conversations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {conversations === undefined ? (
              <div className="py-8 text-center text-text-muted">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                No conversations found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Modality</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Roadmap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((conversation) => (
                    <TableRow
                      key={conversation._id}
                      className="cursor-pointer hover:bg-bg-secondary/50"
                      onClick={() => handleRowClick(conversation._id)}
                    >
                      <TableCell className="text-text-muted">
                        {formatDate(conversation._creationTime)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-text-primary">
                            {conversation.visitorName || conversation.visitorEmail || "Unknown"}
                          </div>
                          {conversation.visitorEmail && conversation.visitorName && (
                            <div className="text-xs text-text-muted">
                              {conversation.visitorEmail}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            conversation.modality === "voice"
                              ? "border-purple-500/30 text-purple-400"
                              : "border-blue-500/30 text-blue-400"
                          )}
                        >
                          {conversation.modality === "voice" ? (
                            <Phone className="h-3 w-3" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          {conversation.modality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {formatDuration(conversation.durationSeconds)}
                      </TableCell>
                      <TableCell>
                        {conversation.outcome ? (
                          <Badge className={cn("capitalize", getOutcomeColor(conversation.outcome))}>
                            {conversation.outcome.replace("_", " ")}
                          </Badge>
                        ) : (
                          <span className="text-text-dim">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {conversation.qualificationScore ? (
                          <Badge className={getScoreColor(conversation.qualificationScore)}>
                            {conversation.qualificationScore}/5
                          </Badge>
                        ) : (
                          <span className="text-text-dim">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {conversation.roadmapStatus ? (
                          <Badge className={cn("capitalize", getRoadmapStatusColor(conversation.roadmapStatus))}>
                            {conversation.roadmapStatus.replace("_", " ")}
                          </Badge>
                        ) : (
                          <span className="text-text-dim">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Conversation Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>
                Conversation with {selectedConversation?.visitorName || selectedConversation?.visitorEmail || "Unknown"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3">
                {selectedConversation && (
                  <>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        selectedConversation.modality === "voice"
                          ? "border-purple-500/30 text-purple-400"
                          : "border-blue-500/30 text-blue-400"
                      )}
                    >
                      {selectedConversation.modality === "voice" ? (
                        <Phone className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {selectedConversation.modality}
                    </Badge>
                    {selectedConversation.durationSeconds && (
                      <span>{formatDuration(selectedConversation.durationSeconds)}</span>
                    )}
                    {selectedConversation.outcome && (
                      <Badge className={cn("capitalize", getOutcomeColor(selectedConversation.outcome))}>
                        {selectedConversation.outcome.replace("_", " ")}
                      </Badge>
                    )}
                    {selectedConversation.qualificationScore && (
                      <Badge className={getScoreColor(selectedConversation.qualificationScore)}>
                        Score: {selectedConversation.qualificationScore}/5
                      </Badge>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Summary */}
            {selectedConversation?.summary && (
              <div className="rounded-lg bg-bg-secondary/50 p-3 text-sm text-text-muted">
                <strong className="text-text-primary">Summary:</strong> {selectedConversation.summary}
              </div>
            )}

            {/* Pain Points */}
            {selectedConversation?.painPoints && selectedConversation.painPoints.length > 0 && (
              <div>
                <span className="text-xs font-medium text-text-dim uppercase mb-1.5 block">Pain Points</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedConversation.painPoints.map((point: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Roadmap Actions */}
            {selectedConversation?.roadmapRequested && (
              <div className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3">
                <span className="text-sm text-text-muted flex-1">
                  Roadmap requested — Status:{" "}
                  <Badge className={cn("capitalize ml-1", getRoadmapStatusColor(selectedConversation.roadmapStatus))}>
                    {selectedConversation.roadmapStatus?.replace("_", " ") || "pending"}
                  </Badge>
                </span>
                {selectedConversation.roadmapStatus !== "sent" && (
                  <div className="flex gap-2">
                    {selectedConversation.roadmapStatus !== "in_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRoadmapStatus(selectedConversation._id, "in_progress")}
                      >
                        Mark In Progress
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                      onClick={() => void handleRoadmapStatus(selectedConversation._id, "sent")}
                    >
                      Mark Sent
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Transcript */}
            <div>
              <span className="text-xs font-medium text-text-dim uppercase mb-1.5 block">Transcript</span>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {selectedConversation?.messages?.map((msg: { _id: string; role: string; content: string }) => (
                    <div
                      key={msg._id}
                      className={cn(
                        "rounded-lg p-3 text-sm",
                        msg.role === "agent"
                          ? "bg-[#D4AF37]/10 text-text-primary mr-8"
                          : "bg-bg-secondary text-text-primary ml-8"
                      )}
                    >
                      <div className="mb-1 text-xs font-medium text-text-dim">
                        {msg.role === "agent" ? "Alex (Agent)" : "Visitor"}
                      </div>
                      {msg.content}
                    </div>
                  ))}
                  {(!selectedConversation?.messages || selectedConversation.messages.length === 0) && (
                    <div className="py-8 text-center text-text-muted">
                      No transcript available for this conversation.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
