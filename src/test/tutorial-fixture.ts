import type { TutorialDraft } from '@/domain/tutorial';

export function tutorialDraftFixture(): TutorialDraft {
  return {
    pronouns: 'he/him', method: 'array',
    scores: { strength: 2, intelligence: 6, constitution: 3, dexterity: 5, charisma: 4 },
    backgrounds: {
      childhood: { category: 'childhood-1', skills: ['Streetwise', 'Perception'] },
      adolescence: { category: 'adolescence-1', skills: ['Fabricate', 'Tracking'] },
      career: { category: 'career-2', skills: ['Dagger', 'Endurance'] },
      hobby: { category: 'hobby-8', skills: ['Driving', 'Repair'] },
    },
    combatId: 'longsword', notes: { trauma: '', looseEnds: '', regret: '', gear: 'Clothes and a longsword' },
  };
}
