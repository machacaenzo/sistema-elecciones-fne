import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RegisterComponent } from "./features/auth/register/register.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'edu-task-manager';

    // 🛡️ FRENO GLOBAL PARA TODA LA APP (Edge, Chrome, Firefox, Safari)
  @HostListener('window:beforeunload', ['$event'])
  prevenirCierreAccidental($event: BeforeUnloadEvent): void {
    $event.preventDefault();
    $event.returnValue = ''; // Activa el cartel nativo de seguridad del navegador
  }
}
