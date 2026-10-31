import { media } from '@/lib/media';

export type ExperienceItem = {
  id: string;
  company: string;
  period: string;
  logo: string;
};

export const experience: ExperienceItem[] = [
  { id: 'otp', company: 'OTP Bank', period: 'Currently', logo: media('/logos/otp-bank.png') },
  { id: 'olimp', company: 'Olimp Bet', period: "'25", logo: media('/logos/olimpbet.png') },
  { id: 'ida', company: 'ida.project', period: "'24", logo: media('/logos/ida-project.png') },
  { id: 'etheric', company: 'etheric', period: "'22", logo: media('/logos/etheric.png') },
];
