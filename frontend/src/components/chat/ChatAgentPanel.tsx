import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Trash2, Loader2, Mic, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAgent } from '@/hooks/useAgent';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';
import type { AgentResponse } from '@/core/api/chat';

interface ChatAgentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatAgentPanel({ open, onOpenChange }: ChatAgentPanelProps) {
  const { messages, isLoadingHistory, isSending, sendMessage, clearHistory } = useAgent();
  const [input, setInput] = useState('');
  const [lastActions, setLastActions] = useState<AgentResponse['actions'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isAvailable: voiceAvailable,
    isListening,
    startListening,
    stopListening,
    currentTranscript,
  } = useSpeechRecognition();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setLastActions(null);
    const result = await sendMessage(text);
    if (result?.actions?.length) {
      setLastActions(result.actions);
    }
  }, [input, isSending, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleVoice = useCallback(async () => {
    if (isListening) {
      await stopListening();
      if (currentTranscript) {
        setInput(currentTranscript);
      }
      return;
    }
    if (voiceAvailable) {
      await startListening();
    }
  }, [isListening, voiceAvailable, startListening, stopListening, currentTranscript]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex h-[85vh] flex-col rounded-t-2xl p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">AI Coach</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearHistory}
              aria-label="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoadingHistory && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">Ask me anything about your fitness data,</p>
              <p className="text-sm">or tell me to take an action.</p>
              <div className="mt-4 space-y-1 text-xs">
                <p>"How many workouts did I do this week?"</p>
                <p>"Copy today's meals for the rest of the week"</p>
                <p>"Move my workout from today to yesterday"</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'mr-auto bg-muted'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {/* Action results */}
          {lastActions && lastActions.length > 0 && (
            <div className="mr-auto max-w-[85%] space-y-1">
              {lastActions.map((action: AgentResponse['actions'][number], i: number) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs',
                    action.success
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  )}
                >
                  {action.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{action.message || action.intent}</span>
                </div>
              ))}
            </div>
          )}

          {isSending && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            {voiceAvailable && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-10 w-10 shrink-0', isListening && 'animate-pulse text-red-500')}
                onClick={handleVoice}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={isListening ? 'Listening...' : 'Ask or command...'}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
