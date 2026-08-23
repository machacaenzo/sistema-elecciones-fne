import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

const neumorphicAlertBase: SweetAlertOptions = {
  background: '#E0E5EC', 
  color: '#3d4a6c',     
  confirmButtonColor: '#33374C', 
  cancelButtonColor: '#8a94a6',  
  customClass: {
    popup: 'neumorphic-popup',
    confirmButton: 'neumorphic-button-alert primary',
    cancelButton: 'neumorphic-button-alert'
  }
};

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  public showSuccessToast(title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#E0E5EC', 
      color: '#10B981',     
      iconColor: '#10B981',   
      customClass: {
        popup: 'neumorphic-toast', 
        timerProgressBar: 'neumorphic-progress-bar-success'
      },
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    Toast.fire({ icon: 'success', title });
  }

  public showAlertSuccess(title: string, text: string): void {
    Swal.fire({
      ...neumorphicAlertBase,
      title,
      text,
      icon: 'success',
      iconColor: '#10B981',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
      customClass: {
        ...neumorphicAlertBase.customClass,
        timerProgressBar: 'neumorphic-progress-bar-success'
      }
    });
  }

  public showAlertError(title: string, text: string): void {
    Swal.fire({
      ...neumorphicAlertBase,
      title,
      text,
      icon: 'error',
      iconColor: '#D9534F',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#D9534F'
    });
  }

  public showAlertWarning(title: string, text: string): void {
    Swal.fire({
      ...neumorphicAlertBase,
      title,
      text,
      icon: 'warning',
      iconColor: '#F59E0B', 
      confirmButtonText: 'Entendido'
    });
  }

  public showConfirm(
    title: string,
    text: string,
    confirmButtonText: string = 'Confirmar'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      ...neumorphicAlertBase,
      title,
      text,
      icon: 'question', 
      iconColor: '#8a94a6',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
  }
}