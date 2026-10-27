import { Baby, Lightbulb, MessageCircleQuestion, Microscope } from 'lucide-react';
import type { ExpansionKind } from '@/domain/schemas';

export const EXPANSION_ICONS: Record<ExpansionKind, React.ReactNode> = {
  simpler: <Baby className="size-4" />,
  example: <Lightbulb className="size-4" />,
  deeper: <Microscope className="size-4" />,
  question: <MessageCircleQuestion className="size-4" />,
};
