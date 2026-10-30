import { t } from '../i18n';
import './startScreen.css';

export interface StartScreenController {
  show: () => void;
  hide: () => void;
}

export function mountStartScreen(
  container: HTMLElement,
  onPlay: () => void
): StartScreenController {
  const strings = t().startScreen;

  const wrapper = document.createElement('div');
  wrapper.className = 'start-screen';
  wrapper.innerHTML = `
    <div class="title">
      <div>${strings.titleLine1}</div>
      <div>${strings.titleLine2}</div>
    </div>
    <button class="play-button" type="button">${strings.playButton}</button>
  `;

  const playButton = wrapper.querySelector<HTMLButtonElement>('.play-button');
  playButton?.addEventListener('click', () => {
    wrapper.classList.add('is-hidden');
    onPlay();
  });

  container.replaceChildren(wrapper);

  return {
    show: () => {
      wrapper.classList.remove('is-hidden');
    },
    hide: () => {
      wrapper.classList.add('is-hidden');
    },
  };
}
