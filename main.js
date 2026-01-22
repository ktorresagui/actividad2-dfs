const $ = (sel, parent = document) => parent.querySelector(sel)

const clean = (v) => String(v ?? "").trim()

const initContacto = () => {
    const form = $("#form-contacto")
    const nombre = $("#nombre")
    const correo = $("#correo")
    const mensaje = $("#mensaje-contacto")

    if (!form || !nombre || !correo || !mensaje) return

    form.addEventListener("submit", (e) => {
        e.preventDefault()

        const n = clean(nombre.value)
        const c = clean(correo.value)
        const m = clean(mensaje.value)

        if (!n) {
            alert("Escribe tu nombre.")
            nombre.focus()
            return
        }

        if (!c) {
            alert("Escribe tu correo.")
            correo.focus()
            return
        }

        if (!correo.checkValidity()) {
            alert("Escribe un correo válido.")
            correo.focus()
            return
        }

        if (!m) {
            alert("Escribe tu mensaje.")
            mensaje.focus()
            return
        }

        alert("Mensaje recibido. ¡Gracias por contactarnos!")
        form.reset()
        nombre.focus()
    })
}

initContacto()
