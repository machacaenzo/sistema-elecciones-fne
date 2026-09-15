import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Eleccion } from '../models/eleccion.model';
import { Candidata } from '../models/candidata.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  // Carga imágenes desde assets de forma segura sin romper el PDF si alguna falta
  private cargarImagen(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }

  // =========================================================================
  // 1. GUION DEL LOCUTOR / FICHAS DE PASARELA (A4 VERTICAL)
  // =========================================================================
  async exportarGuionLocutor(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const escuelaLogo = await this.cargarImagen('assets/esc-normal-logo.png');
    const fneLogo = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate();
    const fechaStr = fechaRef ? fechaRef.toLocaleDateString('es-AR') : 'Sin fecha';

    const ordenadas = [...candidatas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const embajadoras = ordenadas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const embajadores = ordenadas.filter(c => c.categoria === 'Embajador');

    const renderHeader = (categoriaTitulo: string) => {
      // Franja de membrete
      doc.setFillColor(8, 10, 15);
      doc.rect(0, 0, 210, 30, 'F');

      // Logo Escuela Normal (Izquierda)
      if (escuelaLogo) {
        doc.addImage(escuelaLogo, 'PNG', 10, 3, 20, 24);
      }

      // Renglón 1: Institución
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('ESCUELA NORMAL SUPERIOR "GENDARMERÍA NACIONAL" • LA QUIACA', 33, 9);

      // Renglón 2: Nombre del Evento (Autoajustable a 140mm de ancho máx.)
      doc.setFontSize(eleccion.nombre.length > 40 ? 9.5 : 11);
      doc.setTextColor(243, 231, 196); // Dorado claro
      const lineasNombre = doc.splitTextToSize(eleccion.nombre.toUpperCase(), 140);
      doc.text(lineasNombre[0], 33, 16);

      // Renglón 3: Subtítulo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(197, 160, 89);
      doc.text(`GUION OFICIAL DE PASARELA • FECHA: ${fechaStr} • ${categoriaTitulo.toUpperCase()}`, 33, 23);

      // Logo Flor FNE (Derecha)
      if (fneLogo) {
        doc.addImage(fneLogo, 'PNG', 180, 5, 20, 20);
      }
    };

    const renderCandidatas = (lista: Candidata[], categoriaNombre: string) => {
      if (lista.length === 0) return;

      renderHeader(categoriaNombre);
      let y = 35;

      lista.forEach((candidata, index) => {
        const campos = eleccion.camposCandidata || [];
        let alturaEstimada = 42;

        if (campos.length > 0 && candidata.camposPersonalizados) {
          campos.forEach(c => {
            const val = candidata.camposPersonalizados?.[c] || 'No especificado';
            const lineas = doc.splitTextToSize(val, 160);
            alturaEstimada += 13 + (lineas.length * 5);
          });
        } else {
          alturaEstimada += 12;
        }

        if (y + alturaEstimada > 275) {
          doc.addPage();
          renderHeader(categoriaNombre);
          y = 35;
        }

        // Marco de la ficha de pasarela
        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.6);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(12, y, 186, alturaEstimada, 3, 3, 'FD');

        // Moneda N° de Pasada
        doc.setFillColor(197, 160, 89);
        doc.roundedRect(16, y + 5, 18, 12, 2, 2, 'F');
        doc.setTextColor(10, 13, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const numStr = candidata.numero ? (candidata.numero < 10 ? `0${candidata.numero}` : `${candidata.numero}`) : `${index + 1}`;
        doc.text(`#${numStr}`, 25, y + 13, { align: 'center' });

        // Nombre del Participante
        doc.setTextColor(10, 13, 20);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`${candidata.nombre} ${candidata.apellido}`.toUpperCase(), 38, y + 11);

        // Curso
        doc.setFontSize(9);
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
            doc.setFontSize(8.5);
            doc.setTextColor(140, 109, 45);
            doc.text(`• ${campo.toUpperCase()}:`, 18, campoY);
            campoY += 5;

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9.5);
            doc.setTextColor(25, 25, 25);
            const lineasValor = doc.splitTextToSize(`"${valor}"`, 170);
            doc.text(lineasValor, 22, campoY);

            campoY += (lineasValor.length * 5) + 3;
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(130, 130, 130);
          doc.text('Sin datos adicionales registrados.', 18, campoY);
        }

        y += alturaEstimada + 6;
      });
    };

    if (embajadoras.length > 0) {
      renderCandidatas(embajadoras, 'Corte de Embajadoras (Femenino)');
    }

    if (embajadores.length > 0) {
      if (embajadoras.length > 0) doc.addPage();
      renderCandidatas(embajadores, 'Corte de Embajadores (Masculino)');
    }

    doc.save(`Guion_Locutor_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  // =========================================================================
  // 2. PLANILLA DE CALIFICACIÓN DE JURADOS (A4 HORIZONTAL)
  // =========================================================================
  async exportarPlanillaJurado(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const escuelaLogo = await this.cargarImagen('assets/esc-normal-logo.png');
    const fneLogo = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate();
    const fechaStr = fechaRef ? fechaRef.toLocaleDateString('es-AR') : 'Sin fecha';

    const ordenadas = [...candidatas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    const embajadoras = ordenadas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const embajadores = ordenadas.filter(c => c.categoria === 'Embajador');

    const renderHeader = (categoriaTitulo: string) => {
      doc.setFillColor(8, 10, 15);
      doc.rect(0, 0, 297, 32, 'F');

      if (escuelaLogo) {
        doc.addImage(escuelaLogo, 'PNG', 10, 3, 22, 26);
      }

      // Renglón 1: Escuela
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('ESCUELA NORMAL SUPERIOR "GENDARMERÍA NACIONAL" • LA QUIACA', 36, 8.5);

      // Renglón 2: Nombre del Evento (Separado y limpio)
      doc.setFontSize(eleccion.nombre.length > 50 ? 9.5 : 11);
      doc.setTextColor(243, 231, 196);
      doc.text(eleccion.nombre.toUpperCase(), 36, 15);

      // Renglón 3: Planilla y Jurado
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(197, 160, 89);
      doc.text(`PLANILLA OFICIAL (${categoriaTitulo.toUpperCase()})  |  FECHA: ${fechaStr}  |  JURADO: _________________________________________`, 36, 22.5);

      if (fneLogo) {
        doc.addImage(fneLogo, 'PNG', 265, 5, 22, 22);
      }
    };

    const generarTablaCategoria = (lista: Candidata[], criterios: string[], categoriaNombre: string) => {
      if (lista.length === 0) return;

      renderHeader(categoriaNombre);

      const tableHead = [
  ['N°', 'Postulante', 'Curso / División', ...criterios.map(c => `${this.getNombreCriterio(c)}\n(5-10)`), 'Puntaje Total\n(+20 Base)', 'Firma / Obs.']
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
        startY: 35,
        theme: 'grid',
        headStyles: {
          fillColor: [18, 22, 30],
          textColor: [243, 231, 196],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          textColor: [10, 10, 10],
          fontSize: 8.5,
          minCellHeight: 11
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
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text('Firma del Jurado: _________________________________', 175, finalY + 14);
      doc.text('Aclaración: _______________________________________', 175, finalY + 20);
    };

    if (embajadoras.length > 0) {
      const critFem = eleccion.criteriosFemeninos || eleccion.criterios || ['Elegancia', 'Porte', 'Simpatía', 'Pasarela'];
      generarTablaCategoria(embajadoras, critFem, 'Embajadoras');
    }

    if (embajadores.length > 0) {
      if (embajadoras.length > 0) doc.addPage();
      const critMasc = eleccion.criteriosMasculinos || eleccion.criterios || ['Actitud', 'Desenvolvimiento', 'Simpatía', 'Pasarela'];
      generarTablaCategoria(embajadores, critMasc, 'Embajadores');
    }

    doc.save(`Planilla_Jurados_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  // =========================================================================
  // 3. ACTA OFICIAL DE PROCLAMACIÓN (A4 VERTICAL)
  // =========================================================================
  async exportarActaProclamacion(eleccion: Eleccion, candidatas: Candidata[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const escuelaLogo = await this.cargarImagen('assets/esc-normal-logo.png');
    const fneLogo = await this.cargarImagen('assets/logo-fne.png');

    const fechaRef = (eleccion.fechaEvento || eleccion.fechaInicio)?.toDate() || new Date();
    const dia = fechaRef.getDate();
    const mes = fechaRef.toLocaleString('es-AR', { month: 'long' });
    const anio = fechaRef.getFullYear();

    const chicos = candidatas.filter(c => c.categoria === 'Embajador');
    const ordenadosChicos = [...chicos].sort((a, b) => (Number(b.puntuacionTotal) || 0) - (Number(a.puntuacionTotal) || 0));

    const chicas = candidatas.filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const ordenadasChicas = [...chicas].sort((a, b) => (Number(b.puntuacionTotal) || 0) - (Number(a.puntuacionTotal) || 0));

    const puestosMasc = eleccion.puestosMasculinos || ['Embajador', '1er Paje'];
    const puestosFem = eleccion.puestosFemeninos || eleccion.puestos || ['Embajadora', '1ra Princesa', '2da Princesa'];

    const dibujarBloqueFirmas = (posY: number) => {
      let currentY = posY;

      if (currentY + 40 > 275) {
        doc.addPage();
        doc.setFillColor(8, 10, 15);
        doc.rect(0, 0, 210, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('ACTA OFICIAL DE PROCLAMACIÓN • FIRMAS DE CONFORMIDAD', 14, 13);

        if (escuelaLogo) {
          doc.addImage(escuelaLogo, 'PNG', 185, 2, 16, 18);
        }
        currentY = 32;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('En conformidad de lo actuado, firman al pie las autoridades de la institución y el jurado:', 14, currentY + 6);

      const lineY = currentY + 22;

      doc.setDrawColor(150, 150, 150);
      doc.line(16, lineY, 68, lineY);
      doc.line(78, lineY, 132, lineY);
      doc.line(142, lineY, 194, lineY);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text('Directora / Vicedirectora', 42, lineY + 4.5, { align: 'center' });
      doc.text('Presidente de Mesa', 105, lineY + 4.5, { align: 'center' });
      doc.text('Representante del Jurado', 168, lineY + 4.5, { align: 'center' });
    };

    // PÁGINA 1
    doc.setFillColor(8, 10, 15);
    doc.rect(0, 0, 210, 32, 'F');

    if (escuelaLogo) {
      doc.addImage(escuelaLogo, 'PNG', 10, 3, 22, 26);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ESCUELA NORMAL SUPERIOR "GENDARMERÍA NACIONAL"', 36, 9);

    doc.setFontSize(11);
    doc.setTextColor(243, 231, 196);
    doc.text('ACTA OFICIAL DE PROCLAMACIÓN Y RESULTADOS', 36, 15);

    doc.setFontSize(7.5);
    doc.setTextColor(197, 160, 89);
    const lineasSub = doc.splitTextToSize(`${eleccion.nombre.toUpperCase()} • LA QUIACA`, 140);
    doc.text(lineasSub[0], 36, 22);

    if (fneLogo) {
      doc.addImage(fneLogo, 'PNG', 180, 6, 20, 20);
    }

    let y = 37;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const textoActa = `En la ciudad de La Quiaca, a los ${dia} días del mes de ${mes} del año ${anio}, en las instalaciones de la Escuela Normal Superior "Gendarmería Nacional", habiendo finalizado la noche de gala y el conteo oficial de los votos del jurado (incluyendo los 20 puntos base de presentación y las calificaciones de pasarela), las Autoridades presentes y el Honorable Jurado dan fe de los resultados finales y proceden a proclamar a los nuevos Representantes Estudiantiles:`;
    const lineasIntro = doc.splitTextToSize(textoActa, 182);
    doc.text(lineasIntro, 14, y);
    y += (lineasIntro.length * 4) + 4;

    // Cuadro Chicos
    if (ordenadosChicos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
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
        head: [['Título / Distinción Oficial', 'Estudiante Electo', 'Curso / División', 'Puntaje Total']],
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

      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // Cuadro Chicas
    if (ordenadasChicas.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
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
        head: [['Título / Distinción Oficial', 'Estudiante Electa', 'Curso / División', 'Puntaje Total']],
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

      y = (doc as any).lastAutoTable.finalY + 5;
    }

    dibujarBloqueFirmas(Math.max(y, 235));

    // PÁGINA 2
    doc.addPage();
    doc.setFillColor(8, 10, 15);
    doc.rect(0, 0, 210, 26, 'F');

    if (escuelaLogo) {
      doc.addImage(escuelaLogo, 'PNG', 10, 3, 18, 20);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('ESCUELA NORMAL SUPERIOR "GENDARMERÍA NACIONAL"', 32, 10);

    doc.setFontSize(9.5);
    doc.setTextColor(243, 231, 196);
    doc.text('NÓMINA GENERAL DE PARTICIPANTES Y PUNTAJES FINALES', 32, 16);

    doc.setFontSize(7.5);
    doc.setTextColor(197, 160, 89);
    const lineasSub2 = doc.splitTextToSize(`${eleccion.nombre.toUpperCase()} • LA QUIACA`, 140);
    doc.text(lineasSub2[0], 32, 21);

    if (fneLogo) {
      doc.addImage(fneLogo, 'PNG', 182, 3, 18, 18);
    }

    let y2 = 33;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const textoHoja2 = `A continuación, se detalla la lista completa con los puntajes finales obtenidos por todos los estudiantes participantes en sus respectivas categorías oficiales:`;
    const lineasIntro2 = doc.splitTextToSize(textoHoja2, 182);
    doc.text(lineasIntro2, 14, y2);
    y2 += (lineasIntro2.length * 4) + 4;

    if (ordenadosChicos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(140, 109, 45);
      doc.text('NÓMINA COMPLETA: EMBAJADORES (MASCULINO)', 14, y2);
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

    if (ordenadasChicas.length > 0) {
      if (y2 > 160) {
        doc.addPage();
        y2 = 25;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(140, 109, 45);
      doc.text('NÓMINA COMPLETA: EMBAJADORAS (FEMENINO)', 14, y2);
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

    dibujarBloqueFirmas(y2);

    doc.save(`Acta_Oficial_Proclamacion_${this.limpiarNombreArchivo(eleccion.nombre)}.pdf`);
  }

  private limpiarNombreArchivo(texto: string): string {
    return texto.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  getNombreCriterio(criterio: string): string {
  return criterio.includes(':') ? criterio.split(':')[0].trim() : criterio.trim();
}
}
