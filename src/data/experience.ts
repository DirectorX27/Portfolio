export type ExperienceItem = {
  id: string;
  company: string;
  period: string;
  logo: string;
};

export const experience: ExperienceItem[] = [
  { id: 'otp', company: 'OTP Bank', period: 'Currently', logo: '/logos/otp-bank.png' },
  { id: 'olimp', company: 'Olimp Bet', period: "'25", logo: '/logos/olimpbet.png' },
  { id: 'ida', company: 'ida.project', period: "'24", logo: '/logos/ida-project.png' },
  { id: 'etheric', company: 'etheric', period: "'22", logo: '/logos/etheric.png' },
];
