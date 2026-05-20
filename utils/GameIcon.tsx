import {
  Award01Icon,
  BarChartIcon,
  Basketball01Icon,
  BodyPartMuscleIcon,
  Book01Icon,
  Books01Icon,
  Calendar01Icon,
  CastleIcon,
  CheckmarkCircle01Icon,
  CompassIcon,
  CrownIcon,
  DiamondIcon,
  FallingStarIcon,
  Film01Icon,
  FireIcon,
  FlashIcon,
  Globe02Icon,
  GraduateMaleIcon,
  HonourStarIcon,
  MaskTheater01Icon,
  MedalFirstPlaceIcon,
  MedalSecondPlaceIcon,
  MedalThirdPlaceIcon,
  MicroscopeIcon,
  Plant01Icon,
  ScrollIcon,
  Search01Icon,
  Shield01Icon,
  SparklesIcon,
  StarIcon,
  StarsIcon,
  Sword01Icon,
  Target01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';

const ICON_MAP = {
  scroll: ScrollIcon,
  book: Book01Icon,
  search: Search01Icon,
  books: Books01Icon,
  graduate: GraduateMaleIcon,
  fire: FireIcon,
  flash: FlashIcon,
  diamond: DiamondIcon,
  castle: CastleIcon,
  crown: CrownIcon,
  star: StarIcon,
  stars: StarsIcon,
  sparkles: SparklesIcon,
  globe: Globe02Icon,
  shield: Shield01Icon,
  award: Award01Icon,
  medal1: MedalFirstPlaceIcon,
  medal2: MedalSecondPlaceIcon,
  medal3: MedalThirdPlaceIcon,
  plant: Plant01Icon,
  compass: CompassIcon,
  theater: MaskTheater01Icon,
  film: Film01Icon,
  sword: Sword01Icon,
  microscope: MicroscopeIcon,
  chart: BarChartIcon,
  calendar: Calendar01Icon,
  target: Target01Icon,
  check: CheckmarkCircle01Icon,
  muscle: BodyPartMuscleIcon,
  fallingstar: FallingStarIcon,
  honourstar: HonourStarIcon,
  sport: Basketball01Icon,
} as const;

export type GameIconKey = keyof typeof ICON_MAP;

export const GameIcon = ({
  iconKey,
  size,
  color,
}: {
  iconKey: string;
  size: number;
  color?: string;
}) => {
  const Icon = ICON_MAP[iconKey as GameIconKey];
  if (!Icon) return null;
  return <HugeiconsIcon icon={Icon} size={size} color={color ?? '#999999'} strokeWidth={1.5} />;
};
