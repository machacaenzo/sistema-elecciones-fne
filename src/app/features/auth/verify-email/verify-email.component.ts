import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './verify-email.component.html'
})
export class VerifyEmailComponent {
  authService = inject(AuthService);
  isSending = signal(false);

  async resendVerification(): Promise<void> {
    this.isSending.set(true);
    await this.authService.resendVerificationEmail();
    this.isSending.set(false);
  }
}