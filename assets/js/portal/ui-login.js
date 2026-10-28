// Club Hunk Cartagena · Portal · ingreso (login) y recuperación de contraseña
import { auth, MODO } from './api.js';
import { reglas } from './validacion.js';
import { $, inyectarIconos, toast, conCarga, bannerDemo, mensajeError, activarVerPassword, esc, icono } from './ui-comun.js';

inyectarIconos();
bannerDemo(MODO);
activarVerPassword();

const formIngreso = $('#form-ingreso');
const formRec = $('#form-recuperar');
const errorGeneral = $('#ingreso-error');

function pintar(campoNombre, inputId, msg) {
  const inp = document.getElementById(inputId);
  const cont = inp.closest('.campo');
  const err = document.getElementById(inputId + '-err');
  if (msg) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
  cont.classList.toggle('con-error', !!msg);
  err.innerHTML = msg ? `${icono('alert')}<span>${esc(msg)}</span>` : '';
}
function validarCorreo(v) { return reglas.requerido(v) || reglas.correo(v); }

// Si ya hay sesión, directo al panel
(async () => {
  try {
    const s = await auth.sesion();
    if (s && s.usuario) location.replace('panel.html');
  } catch { /* sin sesión */ }
})();

// Ayuda demo
if (MODO === 'demo') {
  $('#demo-ayuda').hidden = false;
  $('#demo-ayuda').addEventListener('click', (e) => {
    const b = e.target.closest('[data-demo]');
    if (!b) return;
    mostrarIngreso();
    $('#f-correo').value = b.dataset.demo;
    $('#f-password').value = 'Hunk2025!';
    pintar('correo', 'f-correo', '');
    pintar('password', 'f-password', '');
    $('#btn-ingresar').focus();
    toast('Datos de prueba listos. Pulsa “Ingresar”.', 'info', 3000);
  });
}

function mostrarIngreso() {
  formRec.hidden = true;
  formIngreso.hidden = false;
}

$('#btn-soy-miembro').addEventListener('click', (e) => {
  mostrarIngreso();
  e.currentTarget.setAttribute('aria-pressed', 'true');
  formIngreso.animate([{ transform: 'translateY(6px)', opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
  $('#f-correo').focus();
});

// Validación en vivo
$('#f-correo').addEventListener('blur', (e) => { if (e.target.value) pintar('correo', 'f-correo', validarCorreo(e.target.value.trim())); });
$('#f-correo').addEventListener('input', (e) => { if (e.target.closest('.con-error')) pintar('correo', 'f-correo', validarCorreo(e.target.value.trim())); });
$('#f-password').addEventListener('input', (e) => { if (e.target.closest('.con-error')) pintar('password', 'f-password', reglas.requerido(e.target.value)); });

formIngreso.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorGeneral.hidden = true;
  const correo = $('#f-correo').value.trim();
  const password = $('#f-password').value;
  const eC = validarCorreo(correo);
  const eP = reglas.requerido(password);
  pintar('correo', 'f-correo', eC);
  pintar('password', 'f-password', eP);
  if (eC) return $('#f-correo').focus();
  if (eP) return $('#f-password').focus();
  await conCarga($('#btn-ingresar'), async () => {
    try {
      const r = await auth.ingresar(correo, password);
      const nombre = r?.miembro?.personal?.nombres?.split(' ')[0];
      toast(nombre ? `¡Hola, ${nombre}! Entrando a tu panel…` : 'Ingreso correcto. Entrando a tu panel…', 'ok', 2500);
      setTimeout(() => location.assign('panel.html'), 500);
    } catch (err) {
      errorGeneral.innerHTML = `${icono('alert')}<span>${esc(mensajeError(err))}</span>`;
      errorGeneral.hidden = false;
      $('#f-password').select();
    }
  }, 'Ingresando…');
});

// Recuperar contraseña
$('#btn-olvide').addEventListener('click', () => {
  formIngreso.hidden = true;
  formRec.hidden = false;
  $('#f-correo-rec').value = $('#f-correo').value.trim();
  $('#f-correo-rec').focus();
});
$('#btn-volver-ingreso').addEventListener('click', () => { mostrarIngreso(); $('#f-correo').focus(); });

formRec.addEventListener('submit', async (e) => {
  e.preventDefault();
  const correo = $('#f-correo-rec').value.trim();
  const m = validarCorreo(correo);
  pintar('correoRec', 'f-correo-rec', m);
  if (m) return $('#f-correo-rec').focus();
  await conCarga($('#btn-recuperar'), async () => {
    try {
      await auth.recuperar(correo);
      toast('Si el correo está registrado, te llegará un enlace para crear una nueva contraseña.', 'ok', 6000);
      mostrarIngreso();
      $('#f-correo').value = correo;
      $('#f-password').focus();
    } catch (err) {
      toast(mensajeError(err), 'error');
    }
  }, 'Enviando…');
});
