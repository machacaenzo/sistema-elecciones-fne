import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Eleccion } from '../models/eleccion.model';
import { Candidata } from '../models/candidata.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  // Carga el logo de la Flor FNE de forma asíncrona
  private cargarImagen(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }

  // =========================================================================
  // 1. GUION DEL LOCUTOR / FICHAS DE PASARELA (SIN DNI)
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
      doc.setFillColor(8, 10, 15);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.text(eleccion.nombre.toUpperCase(), 14, 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(197, 160, 89);
      doc.text(`GUION OFICIAL DE PASARELA • FECHA: ${fechaStr} • CATEGORÍA: ${categoriaTitulo.toUpperCase()}`, 14, 19);

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
        let alturaEstimada = 42;

        if (campos.length > 0 && candidata.camposPersonalizados) {
          campos.forEach(c => {
            const val = candidata.camposPersonalizados?.[c] || 'No especificado';
            const lineas = doc.splitTextToSize(val, 160);
            alturaEstimada += 14 + (lineas.length * 5);
          });
        } else {
          alturaEstimada += 12;
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

        // Curso (Sin DNI)
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 90, 90);
        doc.text(`Curso / División: ${candidata.cursoDivision || 'Sin curso asignado'}`, 38, y + 16);

        // Línea divisoria
        doc.setDrawColor(215, 215, 215);
        doc.setLineWidth(0.3);
        doc.line(16, y + 20, 194, y + 20);

        // Preguntas del Perfil
        let campoY = y + 26;

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
  // 2. PLANILLA DE CALIFICACIÓN DE JURADOS (PLANILLA FÍSICA)
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

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(eleccion.nombre.toUpperCase(), 14, 9);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(197, 160, 89);
      doc.text(`PLANILLA OFICIAL DE CALIFICACIÓN DE JURADO  •  FECHA: ${fechaStr}  •  CATEGORÍA: ${categoriaTitulo.toUpperCase()}`, 14, 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text('NOMBRE DEL JURADO: ____________________________________________________________________', 14, 24);

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

 // =========================================================================
  // 3. ACTA OFICIAL DE PROCLAMACIÓN (CERO ENCIMES Y CONTROL DE ALTURA DINÁMICO)
  // =========================================================================
  async exportarActaProclamacion(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoImg = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate() || new Date();
    const dia = fechaRef.getDate();
    const mes = fechaRef.toLocaleString('es-AR', { month: 'long' });
    const anio = fechaRef.getFullYear();

    // 1. Ordenamos candidatos por puntaje oficial
    const chicos = candidatas.filter(c => c.categoria === 'Embajador');
    const ordenadosChicos = [...chicos].sort((a, b) => (Number(b.puntuacionTotal) || 0) - (Number(a.puntuacionTotal) || 0));

    const chicas = candidatas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const ordenadasChicas = [...chicas].sort((a, b) => (Number(b.puntuacionTotal) || 0) - (Number(a.puntuacionTotal) || 0));

    const puestosMasc = eleccion.puestosMasculinos || ['Embajador', '1er Paje'];
    const puestosFem = eleccion.puestosFemeninos || eleccion.puestos || ['Embajadora', '1ra Princesa', '2da Princesa'];

    // Función inteligente para dibujar las 3 firmas sin pisar nunca el contenido
    const dibujarBloqueFirmas = (posY: number) => {
      let currentY = posY;

      // Si no quedan al menos 40mm libres antes del final de la hoja (297mm), salta de página
      if (currentY + 40 > 275) {
        doc.addPage();

        // Membrete de continuidad en la nueva página
        doc.setFillColor(8, 10, 15);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('ACTA OFICIAL DE PROCLAMACIÓN • FIRMAS DE CONFORMIDAD', 14, 12);

        if (logoImg) {
          doc.addImage(logoImg, 'PNG', 185, 3, 14, 14);
        }
        currentY = 35;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('En conformidad de lo actuado, se labra y firma la presente acta oficial por las partes intervinientes:', 14, currentY + 6);

      const lineY = currentY + 22;

      doc.setDrawColor(150, 150, 150);
      doc.line(16, lineY, 68, lineY);
      doc.line(78, lineY, 132, lineY);
      doc.line(142, lineY, 194, lineY);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text('Firma / Sello Directivo', 42, lineY + 4.5, { align: 'center' });
      doc.text('Presidente de Mesa de Votación', 105, lineY + 4.5, { align: 'center' });
      doc.text('Representante del Jurado', 168, lineY + 4.5, { align: 'center' });
    };

    // =========================================================================
    // 📄 PÁGINA 1: CUADRO DE HONOR Y PROCLAMACIÓN OFICIAL
    // =========================================================================
    doc.setFillColor(8, 10, 15);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ACTA OFICIAL DE PROCLAMACIÓN Y RESULTADOS', 14, 11);

    doc.setFontSize(8.5);
    doc.setTextColor(197, 160, 89);
    doc.text(`${eleccion.nombre.toUpperCase()} • FIESTA NACIONAL DE LOS ESTUDIANTES`, 14, 18);
    doc.text(`LA QUIACA, JUJUY • REPÚBLICA ARGENTINA`, 14, 23);

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 180, 3, 22, 22);
    }

    let y = 35;

    // Párrafo Institucional Hoja 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const textoActa = `En la ciudad de La Quiaca, a los ${dia} días del mes de ${mes} del año ${anio}, habiendo finalizado la noche de gala y el cómputo oficial de votos, el Honorable Jurado y las Autoridades presentes dan fe de los resultados finales y proceden a la proclamación oficial de los Representantes Estudiantiles electos:`;
    const lineasIntro = doc.splitTextToSize(textoActa, 182);
    doc.text(lineasIntro, 14, y);
    y += (lineasIntro.length * 4) + 4;

    // 1. Tabla: Corte Embajadores (Chicos)
    if (ordenadosChicos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(140, 109, 45);
      doc.text('CUADRO DE HONOR: CORTE DEL EMBAJADOR (MASCULINO)', 14, y);
      y += 2.5;

      const bodyChicos = puestosMasc.map((puesto, idx) => {
        const ganador = ordenadosChicos[idx];
        return [
          puesto.toUpperCase(),
          ganador ? `#${ganador.numero || ''} ${ganador.nombre} ${ganador.apellido}`.toUpperCase() : 'VACANTE',
          ganador?.cursoDivision || '—',
          ganador ? `${ganador.puntuacionTotal} pts` : '—'
        ];
      });

      autoTable(doc, {
        head: [['Título / Distinción Oficial', 'Estudiante Electo', 'Curso / División', 'Puntaje']],
        body: bodyChicos,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [18, 22, 30], textColor: [243, 231, 196], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { textColor: [10, 10, 10], fontSize: 8, minCellHeight: 6.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 55 },
          1: { cellWidth: 70, fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { lineColor: [180, 180, 180], lineWidth: 0.2 },
        margin: { left: 14, right: 14 }
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // 2. Tabla: Corte Embajadoras (Chicas)
    if (ordenadasChicas.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(140, 109, 45);
      doc.text('CUADRO DE HONOR: CORTE DE LA EMBAJADORA (FEMENINO)', 14, y);
      y += 2.5;

      const bodyChicas = puestosFem.map((puesto, idx) => {
        const ganadora = ordenadasChicas[idx];
        return [
          puesto.toUpperCase(),
          ganadora ? `#${ganadora.numero || ''} ${ganadora.nombre} ${ganadora.apellido}`.toUpperCase() : 'VACANTE',
          ganadora?.cursoDivision || '—',
          ganadora ? `${ganadora.puntuacionTotal} pts` : '—'
        ];
      });

      autoTable(doc, {
        head: [['Título / Distinción Oficial', 'Estudiante Electa', 'Curso / División', 'Puntaje']],
        body: bodyChicas,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [18, 22, 30], textColor: [243, 231, 196], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { textColor: [10, 10, 10], fontSize: 8, minCellHeight: 6.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 55 },
          1: { cellWidth: 70, fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold' }
        },
        styles: { lineColor: [180, 180, 180], lineWidth: 0.2 },
        margin: { left: 14, right: 14 }
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Firmas Hoja 1 (posicionadas al final de la hoja 1)
    dibujarBloqueFirmas(Math.max(y, 240));

    // =========================================================================
    // 📄 PÁGINA 2: NÓMINA GENERAL SEPARADA POR CATEGORÍAS
    // =========================================================================
    doc.addPage();

    // Encabezado Hoja 2
    doc.setFillColor(8, 10, 15);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('NÓMINA GENERAL DE PARTICIPANTES Y CÓMPUTO FINAL', 14, 11);

    doc.setFontSize(8);
    doc.setTextColor(197, 160, 89);
    doc.text(`${eleccion.nombre.toUpperCase()} • REGISTRO GENERAL DE PUNTUACIONES`, 14, 18);

    if (logoImg) {
      doc.addImage(logoImg, 'PNG', 182, 3, 20, 20);
    }

    let y2 = 33;

    // Párrafo Institucional Hoja 2
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const textoHoja2 = `A continuación, se detalla el registro completo de puntuaciones obtenidas por todos los estudiantes participantes en sus respectivas categorías oficiales:`;
    const lineasIntro2 = doc.splitTextToSize(textoHoja2, 182);
    doc.text(lineasIntro2, 14, y2);
    y2 += (lineasIntro2.length * 4) + 4;

    // --- TABLA SEPARADA 1: TODOS LOS EMBAJADORES (CHICOS) ---
    if (ordenadosChicos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(140, 109, 45);
      doc.text('NÓMINA GENERAL: EMBAJADORES (MASCULINO)', 14, y2);
      y2 += 2.5;

      const filasChicos = ordenadosChicos.map((c, i) => [
        `${i + 1}°`,
        `#${c.numero || ''}`,
        `${c.nombre} ${c.apellido}`.toUpperCase(),
        c.cursoDivision || '—',
        `${c.puntuacionTotal} pts`
      ]);

      autoTable(doc, {
        head: [['Posición', 'N°', 'Estudiante Postulante', 'Curso / División', 'Puntaje Total']],
        body: filasChicos,
        startY: y2,
        theme: 'grid',
        headStyles: { fillColor: [25, 30, 40], textColor: [243, 231, 196], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [20, 20, 20], fontSize: 8, minCellHeight: 5.5 },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
          1: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
          2: { fontStyle: 'bold' },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 26 }
        },
        styles: { lineColor: [190, 190, 190], lineWidth: 0.2 },
        margin: { left: 14, right: 14 }
      });

      y2 = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- TABLA SEPARADA 2: TODAS LAS EMBAJADORAS (CHICAS) ---
    if (ordenadasChicas.length > 0) {
      // Si la tabla de chicos ocupó mucho espacio, salta de página antes de arrancar las chicas
      if (y2 > 160) {
        doc.addPage();
        y2 = 25;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(140, 109, 45);
      doc.text('NÓMINA GENERAL: EMBAJADORAS (FEMENINO)', 14, y2);
      y2 += 2.5;

      const filasChicas = ordenadasChicas.map((c, i) => [
        `${i + 1}°`,
        `#${c.numero || ''}`,
        `${c.nombre} ${c.apellido}`.toUpperCase(),
        c.cursoDivision || '—',
        `${c.puntuacionTotal} pts`
      ]);

      autoTable(doc, {
        head: [['Posición', 'N°', 'Estudiante Postulante', 'Curso / División', 'Puntaje Total']],
        body: filasChicas,
        startY: y2,
        theme: 'grid',
        headStyles: { fillColor: [25, 30, 40], textColor: [243, 231, 196], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [20, 20, 20], fontSize: 8, minCellHeight: 5.5 },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
          1: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
          2: { fontStyle: 'bold' },
          4: { halign: 'center', fontStyle: 'bold', cellWidth: 26 }
        },
        styles: { lineColor: [190, 190, 190], lineWidth: 0.2 },
        margin: { left: 14, right: 14 }
      });

      y2 = (doc as any).lastAutoTable.finalY + 4;
    }

    // Dibujar las firmas al final de las tablas de forma 100% segura
    dibujarBloqueFirmas(y2);

    doc.save(`Acta_Oficial_Proclamacion_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  private limpiarNombreArchivo(texto: string): string {
    return texto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
