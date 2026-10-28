// Club Hunk Cartagena · Portal · vista pública de la ficha de emergencia (la abre el QR del casco)
import { miembros, MODO } from './api.js';
import { $, esc, icono, inyectarIconos, bannerDemo, iniciales, mensajeError } from './ui-comun.js';

inyectarIconos();
bannerDemo(MODO);

const cont = $('#ficha');
const id = new URLSearchParams(location.search).get('id');

const tel = (n) => String(n || '').replace(/[^\d+]/g, '');
const vacioONinguno = (v) => !v || /^(ningun[oa]s?|no|n\/a|na|-)$/i.test(String(v).trim());

function bloque(titulo, ic, valor, { resaltar = false, textoVacio = 'Ninguna reportada' } = {}) {
  const vacio = vacioONinguno(valor);
  return `<section class="em-bloque ${resaltar && !vacio ? 'alerta-roja' : ''}">
    <h3>${icono(ic)}${esc(titulo)}</h3><p>${esc(vacio ? textoVacio : valor)}</p></section>`;
}

function mostrarMensaje(titulo, texto) {
  cont.setAttribute('aria-busy', 'false');
  cont.innerHTML = `<div class="em-bloque" style="text-align:center;padding:28px 18px">
      ${icono('alert')}<h2 style="font:800 1.4rem/1.2 var(--texto);margin:10px 0">${esc(titulo)}</h2><p style="font-size:1rem;font-weight:600">${esc(texto)}</p></div>
    <div class="em-llamar" style="margin-top:18px">
      <a class="btn-llamar linea" href="tel:123">${icono('phone')}<span>Llamar a la línea de emergencias 123<small>Policía, ambulancias y bomberos en Colombia</small></span></a>
    </div>`;
}

async function cargar() {
  if (!id) return mostrarMensaje('Código no válido', 'Este enlace no tiene un identificador de ficha. Si es una emergencia, llama al 123.');
  let f;
  try {
    f = await miembros.fichaEmergencia(id);
  } catch (e) {
    return mostrarMensaje('No pudimos cargar la ficha', `${mensajeError(e)} Si es una emergencia, llama al 123.`);
  }
  if (!f) return mostrarMensaje('Ficha no encontrada', 'Esta ficha no existe o fue desactivada. Si es una emergencia, llama al 123.');

  document.title = `Emergencia · ${f.nombreCorto || 'Motociclista'} · Club Hunk Cartagena`;
  const contactos = (f.emergencia || []).filter(c => c && c.celular);
  const moto = f.moto || {};
  cont.setAttribute('aria-busy', 'false');
  cont.innerHTML = `
    <div class="em-persona">
      <span class="avatar" aria-hidden="true">${esc(iniciales(f.nombreCorto))}</span>
      <div><h2>${esc(f.nombreCorto || 'Motociclista')}</h2><p>Miembro de Club Hunk Cartagena</p></div>
    </div>

    <section class="em-sangre" aria-label="Tipo de sangre ${esc(f.tipoSangre || 'no registrado')}">
      <div><small>Tipo de sangre</small><b>${esc(f.tipoSangre || '—')}</b></div>
      ${icono('drop')}
    </section>

    <div class="em-llamar">
      ${contactos.map(c => `<a class="btn-llamar" href="tel:${esc(tel(c.celular))}">${icono('phone')}
        <span>Llamar a ${esc(c.nombre || 'contacto')}<small>${esc(c.parentesco ? c.parentesco + ' · ' : '')}${esc(c.celular)}</small></span></a>`).join('')}
      <a class="btn-llamar linea" href="tel:123">${icono('phone')}<span>Línea de emergencias 123<small>Policía, ambulancias y bomberos</small></span></a>
    </div>

    <div class="em-bloques">
      ${bloque('Alergias', 'alert', f.alergias, { resaltar: true })}
      ${bloque('Condiciones médicas', 'heart', f.condiciones, { resaltar: true })}
      ${bloque('Medicamentos', 'pill', f.medicamentos, { textoVacio: 'Ninguno reportado' })}
      ${bloque('EPS / seguro médico', 'shield', f.eps, { textoVacio: 'No registrada' })}
    </div>

    ${(moto.placa || moto.modelo) ? `<div class="em-moto">${icono('bike')}<span>${esc([moto.modelo, moto.color].filter(Boolean).join(' · '))}</span>${moto.placa ? `<span class="em-placa">${esc(moto.placa)}</span>` : ''}</div>` : ''}

    <footer class="em-pie">
      <img src="../recursos/logo/club-hunk-logo-512.webp" alt="Club Hunk Cartagena">
      <p>Información entregada voluntariamente por el motociclista para atenderlo en una emergencia (Ley 1581 de 2012). Úsala solo con ese fin.</p>
    </footer>`;
}

cargar();
