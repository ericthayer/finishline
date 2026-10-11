import { PLATFORM_LABELS } from '../../domain/brief.ts';
import { checkPlatformFields, toPlatformLink } from '../../domain/project-fields.ts';
import { AGENT_PLATFORMS, type AgentPlatformId, type PlatformLink } from '../../domain/types.ts';
import { formField, selectField, type Field, type FieldControl } from './form.ts';

// Current platform + deep link (SPEC §3), shared by the create and edit dialogs.

export interface PlatformFields {
  /** In form order: platform, its name (shown only for Other), deep link. */
  readonly fields: readonly Field<FieldControl>[];
  /** Marks what is wrong and returns false, or returns true when every field is fine. */
  check(): boolean;
  /** The checked values to save; null when no platform is picked. */
  value(): PlatformLink | null;
}

const isPlatform = (value: string): value is AgentPlatformId => (AGENT_PLATFORMS as readonly string[]).includes(value);

export function platformFields(current: PlatformLink | null = null): PlatformFields {
  const platform = selectField({
    name: 'platform',
    label: 'Platform (optional)',
    help: 'Where the work happens now.',
    value: current?.platform ?? '',
    options: [{ value: '', label: 'None' }, ...AGENT_PLATFORMS.map((id) => ({ value: id, label: PLATFORM_LABELS[id] }))],
  });
  const label = formField({
    name: 'platform-label',
    label: 'Platform name',
    help: 'Which tool, since it is not in the list.',
    value: current?.label ?? '',
  });
  const url = formField({
    name: 'platform-url',
    label: 'Deep link (optional)',
    help: 'Opens this project on the platform, like the Bolt project or Claude chat. Starts with https://.',
    value: current?.url ?? '',
  });
  url.control.setAttribute('type', 'url');

  const picked = (): AgentPlatformId | '' => {
    const v = platform.value();
    return isPlatform(v) ? v : '';
  };
  const sync = (): void => {
    label.wrap.hidden = picked() !== 'other';
  };
  platform.control.addEventListener('change', sync);
  sync();

  const values = (): { platform: AgentPlatformId | ''; label: string; url: string } => ({
    platform: picked(),
    label: label.value(),
    url: url.value(),
  });

  return {
    fields: [platform, label, url],
    check() {
      const errors = checkPlatformFields(values());
      label.invalid(errors.label);
      url.invalid(errors.url);
      return !errors.label && !errors.url;
    },
    value: () => toPlatformLink(values()),
  };
}
