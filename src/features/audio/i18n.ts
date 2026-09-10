import { localeStore } from '../../i18n';

const messages = {
  ko: { mute: '소리 끄기', unmute: '소리 켜기', volume: '효과음 볼륨' },
  en: { mute: 'Mute sound', unmute: 'Unmute sound', volume: 'Sound effect volume' },
} as const;

export function audioText(key: keyof typeof messages.en) { return messages[localeStore.getState().locale][key]; }
