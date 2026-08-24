import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Eleccion } from '../models/eleccion.model';
import { Candidata } from '../models/candidata.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  // Función auxiliar para cargar la imagen del logo desde assets
  private cargarImagen(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // Si no la encuentra, sigue sin romper el PDF
    });
  }

  // =========================================================================
  // 1. GUION DEL LOCUTOR (CON LOGO DE LA FLOR FNE)
  // =========================================================================
  async exportarGuionLocutor(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoImg = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate();
    const fechaStr = fechaRef ? fechaRef.toLocaleDateString('es-AR') : 'Sin fecha';

    const ordenadas = [...candidatas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const embajadoras = ordenadas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const embajadores = ordenadas.filter(c => c.categoria === 'Embajador');

    const renderHeader = (categoriaTitulo: string) => {
      // Franja superior
      doc.setFillColor(8, 10, 15);
      doc.rect(0, 0, 210, 26, 'F');

      // Título y Subtítulo
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.text(eleccion.nombre.toUpperCase(), 14, 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(197, 160, 89);
      doc.text(`GUION OFICIAL DE PASARELA • FECHA: ${fechaStr} • CATEGORÍA: ${categoriaTitulo.toUpperCase()}`, 14, 19);

      // Logo Flor FNE en la esquina superior derecha
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 182, 3, 20, 20);
      }
    };

    const renderCandidatas = (lista: Candidata[], categoriaNombre: string) => {
      if (lista.length === 0) return;

      renderHeader(categoriaNombre);
      let y = 32;

      lista.forEach((candidata, index) => {
        const campos = eleccion.camposCandidata || [];
        let alturaEstimada = 45;

        if (campos.length > 0 && candidata.camposPersonalizados) {
          campos.forEach(c => {
            const val = candidata.camposPersonalizados?.[c] || 'No especificado';
            const lineas = doc.splitTextToSize(val, 160);
            alturaEstimada += 14 + (lineas.length * 5);
          });
        } else {
          alturaEstimada += 15;
        }

        if (y + alturaEstimada > 275) {
          doc.addPage();
          renderHeader(categoriaNombre);
          y = 32;
        }

        // Marco de la ficha
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.6);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(12, y, 186, alturaEstimada, 3, 3, 'FD');

        // Badge N° de Pasada
        doc.setFillColor(197, 160, 89);
        doc.roundedRect(16, y + 5, 18, 12, 2, 2, 'F');
        doc.setTextColor(10, 13, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const numStr = candidata.numero ? (candidata.numero < 10 ? `0${candidata.numero}` : `${candidata.numero}`) : `${index + 1}`;
        doc.text(`#${numStr}`, 25, y + 13, { align: 'center' });

        // Nombre
        doc.setTextColor(10, 13, 20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${candidata.nombre} ${candidata.apellido}`.toUpperCase(), 38, y + 11);

        // Curso y DNI
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 90, 90);
        doc.text(`Curso / División: ${candidata.cursoDivision || 'No especificado'}    |    DNI: ${candidata.dni || 'S/D'}`, 38, y + 16);

        // Línea divisoria
        doc.setDrawColor(215, 215, 215);
        doc.setLineWidth(0.3);
        doc.line(16, y + 21, 194, y + 21);

        // Preguntas del Perfil
        let campoY = y + 28;

        if (campos.length > 0 && candidata.camposPersonalizados) {
          campos.forEach(campo => {
            const valor = candidata.camposPersonalizados?.[campo] || 'No especificado';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(140, 109, 45);
            doc.text(`• ${campo.toUpperCase()}:`, 18, campoY);
            campoY += 5.5;

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10.5);
            doc.setTextColor(25, 25, 25);
            const lineasValor = doc.splitTextToSize(`"${valor}"`, 170);
            doc.text(lineasValor, 22, campoY);

            campoY += (lineasValor.length * 5.5) + 3;
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9.5);
          doc.setTextColor(130, 130, 130);
          doc.text('Sin datos adicionales registrados en el perfil.', 18, campoY);
        }

        y += alturaEstimada + 7;
      });
    };

    if (embajadoras.length > 0) {
      renderCandidatas(embajadoras, 'Embajadoras (Representantes)');
    }

    if (embajadores.length > 0) {
      if (embajadoras.length > 0) doc.addPage();
      renderCandidatas(embajadores, 'Embajadores');
    }

    doc.save(`Guion_Locutor_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  // =========================================================================
  // 2. PLANILLA DE JURADOS (CON LOGO DE LA FLOR FNE)
  // =========================================================================
  async exportarPlanillaJurado(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logoImg = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate();
    const fechaStr = fechaRef ? fechaRef.toLocaleDateString('es-AR') : 'Sin fecha';

    const ordenadas = [...candidatas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const embajadoras = ordenadas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const embajadores = ordenadas.filter(c => c.categoria === 'Embajador');

    const renderHeader = (categoriaTitulo: string) => {
      doc.setFillColor(8, 10, 15);
      doc.rect(0, 0, 297, 30, 'F');

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(eleccion.nombre.toUpperCase(), 14, 9);

      // Subtítulo
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(197, 160, 89);
      doc.text(`PLANILLA OFICIAL DE CALIFICACIÓN DE JURADO  •  FECHA: ${fechaStr}  •  CATEGORÍA: ${categoriaTitulo.toUpperCase()}`, 14, 16);

      // Espacio para Nombre del Jurado
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text('NOMBRE DEL JURADO: ____________________________________________________________________', 14, 24);

      // Logo Flor FNE en la esquina derecha
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 268, 3, 24, 24);
      }
    };

    const generarTablaCategoria = (lista: Candidata[], criterios: string[], categoriaNombre: string) => {
      if (lista.length === 0) return;

      renderHeader(categoriaNombre);

      const tableHead = [
        ['N°', 'Postulante', 'Curso / División', ...criterios.map(c => `${c}\n(1-10)`), 'Puntaje\nTotal', 'Firma / Obs.']
      ];

      const tableBody = lista.map(c => [
        `#${c.numero || ''}`,
        `${c.nombre} ${c.apellido}`,
        c.cursoDivision || '',
        ...criterios.map(() => ''),
        '',
        ''
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 33,
        theme: 'grid',
        headStyles: {
          fillColor: [18, 22, 30],
          textColor: [243, 231, 196],
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          textColor: [10, 10, 10],
          fontSize: 9,
          minCellHeight: 12
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 55, fontStyle: 'bold' },
          2: { cellWidth: 38 }
        },
        styles: {
          lineColor: [170, 170, 170],
          lineWidth: 0.2
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 160;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text('Firma del Jurado: _________________________________', 175, finalY + 14);
      doc.text('Aclaración / DNI: _________________________________', 175, finalY + 20);
    };

    if (embajadoras.length > 0) {
      const critFem = eleccion.criteriosFemeninos || eleccion.criterios || ['Elegancia', 'Simpatía', 'Pasarela'];
      generarTablaCategoria(embajadoras, critFem, 'Embajadoras (Representantes)');
    }

    if (embajadores.length > 0) {
      if (embajadoras.length > 0) doc.addPage();
      const critMasc = eleccion.criteriosMasculinos || eleccion.criterios || ['Actitud', 'Simpatía', 'Pasarela'];
      generarTablaCategoria(embajadores, critMasc, 'Embajadores');
    }

    doc.save(`Planilla_Jurados_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  private limpiarNombreArchivo(texto: string): string {
    return texto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
