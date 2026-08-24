import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

// Configuración base de alertas SweetAlert2 con diseño Gala Negro & Oro
const galaAlertBase: SweetAlertOptions = {
  background: '#0A0A0A',
  color: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.85)',
  buttonsStyling: false, // Desactiva estilos por defecto de SweetAlert para usar los nuestros
  customClass: {
    popup: 'rounded-3xl border-2 border-[#C5A059]/50 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(197,160,89,0.2)] p-6 font-sans',
    title: 'text-lg sm:text-xl font-black text-[#F3E7C4] uppercase tracking-wider pt-2',
    htmlContainer: 'text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed font-normal',
    confirmButton: 'px-7 py-3 rounded-2xl bg-gradient-to-b from-[#FFF3D1] via-[#C5A059] to-[#8C6D2D] text-[#0A0D14] font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(197,160,89,0.35)] border border-[#FFF3D1]/70 mx-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer',
    cancelButton: 'px-6 py-3 rounded-2xl bg-[#141414] hover:bg-white/10 border border-[#C5A059]/40 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-wider mx-1.5 transition-all cursor-pointer',
    actions: 'gap-2 mt-5'
  }
};

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  // 1. Toast emergente en la esquina superior derecha
  public showSuccessToast(title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#0A0A0A',
      color: '#F3E7C4',
      iconColor: '#10B981',
      customClass: {
        popup: 'rounded-2xl border border-[#C5A059]/50 shadow-[0_10px_30px_rgba(0,0,0,0.9)] p-3.5 font-sans font-bold text-xs',
        timerProgressBar: 'bg-[#C5A059]'
      },
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    Toast.fire({ icon: 'success', title });
  }

  // 2. Alerta de Éxito / Guardado correcto
  public showAlertSuccess(title: string, text: string): void {
    Swal.fire({
      ...galaAlertBase,
      title,
      text,
      icon: 'success',
      iconColor: '#10B981',
      timer: 2200,
      showConfirmButton: false,
      timerProgressBar: true,
      customClass: {
        ...galaAlertBase.customClass,
        timerProgressBar: 'bg-[#10B981]'
      }
    });
  }

  // 3. Alerta de Error
  public showAlertError(title: string, text: string): void {
    Swal.fire({
      ...galaAlertBase,
      title,
      text,
      icon: 'error',
      iconColor: '#EF4444',
      confirmButtonText: 'Entendido'
    });
  }

  // 4. Alerta de Advertencia / Validación
  public showAlertWarning(title: string, text: string): void {
    Swal.fire({
      ...galaAlertBase,
      title,
      text,
      icon: 'warning',
      iconColor: '#C5A059',
      confirmButtonText: 'Entendido'
    });
  }

  // 5. Modal de Confirmación (Preguntas Sí / Cancelar)
  public showConfirm(
    title: string,
    text: string,
    confirmButtonText: string = 'Confirmar'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      ...galaAlertBase,
      title,
      text,
      icon: 'question',
      iconColor: '#C5A059',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
  }
}
