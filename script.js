// ========================================
// CONFIGURACIÓN FIREBASE
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyCtrBIETFNx1IWwlMrKdWepkSmDayFXkns",
  authDomain: "conexionlaboral.firebaseapp.com",
  projectId: "conexionlaboral",
  storageBucket: "conexionlaboral.firebasestorage.app",
  messagingSenderId: "609770200169",
  appId: "1:609770200169:web:90648cb61d36aa4ad516f8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const ADMIN_UID = "IOQib7dXe1M55kuQU59vVAgcmy52";

// ========================================
// UTILIDADES
// ========================================
function val(id){
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function limpiarCampos(ids){
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  const chk1 = document.getElementById("ocultar-datos");
  if(chk1) chk1.checked = false;
  const chk2 = document.getElementById("ocultar-datos-e");
  if(chk2) chk2.checked = false;
}

function convertirBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ()=>resolve(reader.result);
    reader.onerror = error=>reject(error);
  });
}

// ========================================
// AUTH
// ========================================
auth.onAuthStateChanged(user=>{
  const usuarioActivo = document.getElementById("usuario-activo");
  if(usuarioActivo){
    usuarioActivo.innerText = user 
      ? "Sesión activa: " + user.email
      : "No hay sesión iniciada";
  }

  escucharTrabajos();
  escucharEmpleos();
  escucharExitos();
});

async function login(){
  const email = val("email");
  const password = val("password");
  if(!email || !password) return alert("Completar email y contraseña");

  try{
    await auth.signInWithEmailAndPassword(email,password);
  }catch(e){
    alert("Error: " + e.message);
  }
}

async function registrar(){
  const email = val("email");
  const password = val("password");
  if(!email || !password) return alert("Completar email y contraseña");

  try{
    await auth.createUserWithEmailAndPassword(email,password);
  }catch(e){
    alert("Error: " + e.message);
  }
}

function logout(){
  auth.signOut();
}

// ========================================
// PUBLICAR TRABAJO
// ========================================
async function publicarTrabajo(){
  const user = auth.currentUser;
  if(!user) return alert("Debés iniciar sesión");

  try{
    const nombre = val("nombre-t");
    const edad = val("edad-t");
    const tel = val("tel-t");
    const emailContacto = val("email-t");
    const direccion = val("direccion-t");
    const msg = val("msg-t");
    const ocultarDatos = document.getElementById("ocultar-datos")?.checked || false;

    if(!nombre || !tel || !msg)
      return alert("Completar campos obligatorios");

    const foto = document.getElementById("foto-t")?.files[0];
    const cv = document.getElementById("cv-t")?.files[0];

    let foto64 = "";
    let cv64 = "";

    if(foto) foto64 = await convertirBase64(foto);
    if(cv) cv64 = await convertirBase64(cv);

    await db.collection("trabajos").add({
      nombre, edad, tel,
      email: emailContacto,
      direccion, msg,
      foto: foto64,
      cv: cv64,
      ocultarDatos,
      userId: user.uid,
      fecha: new Date()
    });

    limpiarCampos(["nombre-t","edad-t","tel-t","email-t","direccion-t","msg-t"]);

  }catch(error){
    console.error(error);
  }
}

// ========================================
// PUBLICAR EMPLEO
// ========================================
async function publicarEmpleo(){
  const user = auth.currentUser;
  if(!user) return alert("Debés iniciar sesión");

  try{
    const nombre = val("nombre-e");
    const tel = val("tel-e");
    const direccion = val("direccion-e");
    const msg = val("msg-e");
    const ocultarDatos = document.getElementById("ocultar-datos-e")?.checked || false;

    if(!nombre || !tel || !msg)
      return alert("Completar campos obligatorios");

    await db.collection("empleos").add({
      nombre, tel, direccion, msg,
      ocultarDatos,
      userId: user.uid,
      fecha: new Date()
    });

    limpiarCampos(["nombre-e","tel-e","direccion-e","msg-e"]);

  }catch(error){
    console.error(error);
  }
}

// ========================================
// PUBLICAR EXITO
// ========================================
async function publicarExito(){
  const user = auth.currentUser;
  if(!user) return alert("Debés iniciar sesión");

  const texto = val("msg-exito");
  if(!texto) return alert("Escribí un comentario");

  try{
    await db.collection("exitos").add({
      texto,
      userId: user.uid,
      fecha: new Date()
    });

    document.getElementById("msg-exito").value = "";

  }catch(error){
    console.error(error);
  }
}

// ========================================
// ELIMINAR
// ========================================
async function eliminarDoc(coleccion,id,userId){
  const currentUser = auth.currentUser;
  if(!currentUser) return;

  if(userId !== currentUser.uid && currentUser.uid !== ADMIN_UID)
    return alert("No podés eliminar esto");

  if(confirm("¿Seguro que querés eliminar?")){
    await db.collection(coleccion).doc(id).delete();
  }
}

// ========================================
// ESCUCHAR TRABAJOS
// ========================================
function escucharTrabajos(){
  const lista = document.getElementById("lista-trabajo");
  if(!lista) return;

  db.collection("trabajos")
    .orderBy("fecha","desc")
    .onSnapshot(snapshot=>{
      lista.innerHTML = "";
      const currentUser = auth.currentUser;

      snapshot.forEach(doc=>{
        const d = doc.data();

        let datos = `
          <p><strong>${d.nombre}</strong> (${d.edad || "-"})</p>
          <p>${d.msg}</p>
        `;

        if(!d.ocultarDatos){
          if(d.foto){
            datos += `<img src="${d.foto}" style="max-width:150px;border-radius:8px;margin-top:8px;">`;
          }

          datos += `
            <p>📞 ${d.tel}</p>
            <p>📧 ${d.email || ""}</p>
            <p>📍 ${d.direccion || ""}</p>
          `;

          if(d.cv){
            datos += `
              <p>
                <a href="${d.cv}" download="cv_${d.nombre}.pdf">
                  📄 Descargar CV
                </a>
              </p>
            `;
          }
        }

        let botonEliminar = "";
        if(currentUser && (currentUser.uid === d.userId || currentUser.uid === ADMIN_UID)){
          botonEliminar = `
            <button onclick="eliminarDoc('trabajos','${doc.id}','${d.userId}')"
            style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;margin-top:5px;">
            Eliminar
            </button>
          `;
        }

        lista.innerHTML += `<div class="post-card">${datos}${botonEliminar}</div>`;
      });
    });
}

// ========================================
// ESCUCHAR EMPLEOS
// ========================================
function escucharEmpleos(){
  const lista = document.getElementById("lista-empleo");
  if(!lista) return;

  db.collection("empleos")
    .orderBy("fecha","desc")
    .onSnapshot(snapshot=>{
      lista.innerHTML = "";
      const currentUser = auth.currentUser;

      snapshot.forEach(doc=>{
        const d = doc.data();

        let datos = `
          <p><strong>${d.nombre}</strong></p>
          <p>${d.msg}</p>
        `;

        if(!d.ocultarDatos){
          datos += `
            <p>📞 ${d.tel}</p>
            <p>📍 ${d.direccion}</p>
          `;
        }

        let botonEliminar = "";
        if(currentUser && (currentUser.uid === d.userId || currentUser.uid === ADMIN_UID)){
          botonEliminar = `
            <button onclick="eliminarDoc('empleos','${doc.id}','${d.userId}')"
            style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;margin-top:5px;">
            Eliminar
            </button>
          `;
        }

        lista.innerHTML += `<div class="post-card">${datos}${botonEliminar}</div>`;
      });
    });
}

// ========================================
// ESCUCHAR EXITO
// ========================================
function escucharExitos(){
  const lista = document.getElementById("lista-exitos");
  if(!lista) return;

  db.collection("exitos")
    .orderBy("fecha","desc")
    .onSnapshot(snapshot=>{
      lista.innerHTML = "";
      const currentUser = auth.currentUser;

      snapshot.forEach(doc=>{
        const d = doc.data();

        let botonEliminar = "";
        if(currentUser && (currentUser.uid === d.userId || currentUser.uid === ADMIN_UID)){
          botonEliminar = `
            <button onclick="eliminarDoc('exitos','${doc.id}','${d.userId}')"
            style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;margin-top:5px;">
            Eliminar
            </button>
          `;
        }

        lista.innerHTML += `
          <div class="post-card">
            <p>${d.texto}</p>
            ${botonEliminar}
          </div>
        `;
      });
    });
}

// ========================================
// MODALES
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  const modalInfo = document.getElementById("modalInfo");
  const abrirInfo = document.getElementById("abrirModal");
  const cerrarInfo = document.getElementById("cerrarModal");

  const modalAyuda = document.getElementById("modalAyuda");
  const abrirAyuda = document.getElementById("abrirModalAyuda");
  const cerrarAyuda = document.getElementById("cerrarModalAyuda");

  const modalVIP = document.getElementById("modalVIP");
const abrirModalVIP = document.getElementById("abrirModalVIP");
const cerrarModalVIP = document.getElementById("cerrarModalVIP");
  
  if(abrirInfo) abrirInfo.addEventListener("click", () => modalInfo.style.display = "flex");
  if(cerrarInfo) cerrarInfo.addEventListener("click", () => modalInfo.style.display = "none");

  if(abrirAyuda) abrirAyuda.addEventListener("click", () => modalAyuda.style.display = "flex");
  if(cerrarAyuda) cerrarAyuda.addEventListener("click", () => modalAyuda.style.display = "none");

  if (abrirModalVIP) abrirModalVIP.addEventListener("click", () => modalVIP.style.display = "flex");
if (cerrarModalVIP) cerrarModalVIP.addEventListener("click", () => modalVIP.style.display = "none");
  
  window.addEventListener("click", (e) => {
    if(e.target === modalInfo) modalInfo.style.display = "none";
    if(e.target === modalAyuda) modalAyuda.style.display = "none";
    if (e.target === modalVIP) modalVIP.style.display = "none";
  });

});
