import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Loader2, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useBrowserSpeech } from '@/hooks/useBrowserSpeech';
import { parseFoodItems, getMealStartTime, inferMealFromTime, textContainsMealKeyword } from '@/features/energy/parseFoodText';
import type { MealType } from '@/features/energy/parseFoodText';
import { searchFoods, lookupOrCreateFood } from '@/features/energy/api';
import type { FoodSearchResult } from '@/features/energy/api';

interface ResolvedEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionAmount?: number;
  portionUnit?: string;
  startTime?: string;
  mealType?: string;
}

interface QuickVoiceEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType?: MealType;
  onSave: (entries: ResolvedEntry[]) => Promise<void>;
}

type Phase = 'recording' | 'review';

export default function QuickVoiceEntry({
  open,
  onOpenChange,
  mealType,
  onSave,
}: QuickVoiceEntryProps) {
  const { isListening, transcript, error: speechError, isSupported, start, stop, reset } =
    useBrowserSpeech();

  const [phase, setPhase] = useState<Phase>('recording');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [resolvedItems, setResolvedItems] = useState<ResolvedEntry[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset all state when sheet closes
  useEffect(() => {
    if (!open) {
      stop();
      reset();
      setPhase('recording');
      setShowTextInput(false);
      setTextInput('');
      setResolvedItems([]);
      setIsResolving(false);
      setIsSaving(false);
    }
  }, [open, stop, reset]);

  // Show speech errors as toasts
  useEffect(() => {
    if (speechError) {
      toast.error(speechError);
    }
  }, [speechError]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      reset();
      start();
    }
  }, [isListening, start, stop, reset]);

  const resolveItems = useCallback(
    async (text: string) => {
      const parsed = parseFoodItems(text);
      if (parsed.length === 0) {
        toast.error('No food items found. Please try again.');
        return;
      }

      // Determine how to assign meal types:
      // If user explicitly mentioned meal keywords, trust the per-item parsed meal
      // Otherwise fall back to the prop mealType or infer from time of day
      const hasExplicitMeals = textContainsMealKeyword(text);
      const fallbackMeal = mealType ?? inferMealFromTime();

      setPhase('review');
      setIsResolving(true);

      const resolved: ResolvedEntry[] = [];

      for (const item of parsed) {
        try {
          let nutrition: FoodSearchResult | null = null;

          const results = await searchFoods(item.name, 1);
          if (results.length > 0) {
            nutrition = results[0];
          } else {
            nutrition = await lookupOrCreateFood(item.name);
          }

          if (nutrition) {
            const effectiveMeal = hasExplicitMeals ? item.meal : fallbackMeal;
            resolved.push({
              name: nutrition.name || item.name,
              calories: nutrition.calories,
              protein: nutrition.protein,
              carbs: nutrition.carbs,
              fats: nutrition.fat,
              portionAmount: item.amount ?? undefined,
              portionUnit: item.unit ?? undefined,
              startTime: getMealStartTime(effectiveMeal),
              mealType: effectiveMeal.toLowerCase(),
            });
          }
        } catch {
          toast.error(`Could not resolve "${item.name}"`);
        }
      }

      setResolvedItems(resolved);
      setIsResolving(false);

      if (resolved.length === 0) {
        toast.error('Could not resolve any food items.');
        setPhase('recording');
      }
    },
    [mealType],
  );

  const handleDone = useCallback(() => {
    const text = showTextInput ? textInput : transcript;
    if (!text.trim()) {
      toast.error('No input provided. Say or type something first.');
      return;
    }
    stop();
    resolveItems(text.trim());
  }, [showTextInput, textInput, transcript, stop, resolveItems]);

  const handleRemoveItem = useCallback((index: number) => {
    setResolvedItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setPhase('recording');
      }
      return next;
    });
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (resolvedItems.length === 0) return;
    setIsSaving(true);
    try {
      await onSave(resolvedItems);
      toast.success(`${resolvedItems.length} item${resolvedItems.length > 1 ? 's' : ''} saved`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to save entries. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [resolvedItems, onSave, onOpenChange]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) {
      toast.error('Please type something first.');
      return;
    }
    resolveItems(textInput.trim());
  }, [textInput, resolveItems]);

  const currentText = showTextInput ? textInput : transcript;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[80vh] overflow-y-auto"
        showCloseButton={false}
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-center text-base font-semibold">
            {mealType ? `Add to ${mealType}` : 'What did you eat?'}
          </SheetTitle>
        </SheetHeader>

        {phase === 'recording' && (
          <div className="flex flex-col items-center gap-4 py-6">
            {/* Mic button */}
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={!isSupported && !showTextInput}
              className={[
                'relative flex h-20 w-20 items-center justify-center rounded-full transition-colors',
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-primary text-primary-foreground',
                !isSupported && !showTextInput ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              {/* Pulse ring when listening */}
              {isListening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />
              )}
              {isListening ? (
                <MicOff className="relative z-10 h-8 w-8" />
              ) : (
                <Mic className="relative z-10 h-8 w-8" />
              )}
            </button>

            <p className="text-sm text-muted-foreground">
              {isListening
                ? 'Tap to stop'
                : isSupported
                  ? 'Tap to start listening'
                  : 'Speech not supported in this browser'}
            </p>

            {/* Live transcript */}
            {transcript && !showTextInput && (
              <p className="max-w-full px-4 text-center text-sm text-muted-foreground italic break-words">
                "{transcript}"
              </p>
            )}

            {/* Text input fallback */}
            {showTextInput ? (
              <div className="w-full px-4">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. 2 eggs, toast with butter, coffee"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  Add Items
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stop();
                  setShowTextInput(true);
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2"
              >
                <Keyboard className="h-3.5 w-3.5" />
                or type it
              </button>
            )}

            {/* Done button when there is transcript text */}
            {!showTextInput && currentText.trim() && !isListening && (
              <button
                type="button"
                onClick={handleDone}
                className="mt-2 w-full max-w-xs rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Done
              </button>
            )}
          </div>
        )}

        {phase === 'review' && (
          <div className="flex flex-col gap-4 py-4">
            {isResolving ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Looking up nutrition info...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {resolvedItems.length} item{resolvedItems.length !== 1 ? 's' : ''} found
                </p>

                <ul className="flex flex-col gap-2">
                  {resolvedItems.map((item, idx) => (
                    <li
                      key={`${item.name}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          {item.mealType && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                              {item.mealType}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          P {item.protein}g &middot; C {item.carbs}g &middot; F {item.fats}g
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium tabular-nums">
                          {item.calories} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                          aria-label={`Remove ${item.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving || resolvedItems.length === 0}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save All ({resolvedItems.length})
                </button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
