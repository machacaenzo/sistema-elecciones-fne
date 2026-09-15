import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FullscreenService {
  // Señal que sabe en todo momento si la app está en pantalla completa o no
  isFullscreen = signal<boolean>(false);

  constructor() {
    // Detecta automáticamente si el usuario entra o sale (por botón, F11 o tecla Esc)
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  toggle(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error al activar pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Error al salir de pantalla completa:', err);
      });
    }
  }
}
