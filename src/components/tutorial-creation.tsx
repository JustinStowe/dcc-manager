'use client';

import { useTutorialCreationController } from '@/controllers/use-tutorial-creation-controller';
import { TutorialCreationView, type TutorialCreationProps } from '@/views/tutorial-creation-view';

export function TutorialCreation(props: TutorialCreationProps) {
  const { model, actions } = useTutorialCreationController(props.campaignId, props.owners[0]?.id ?? '', props.conversion?.name ?? '');
  return <TutorialCreationView {...props} model={model} actions={actions} />;
}
