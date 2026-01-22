const $ = (sel, parent = document) => parent.querySelector(sel)
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel))

const makeId = () => `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

const escapeHTML = (str) => {
    const div = document.createElement("div")
    div.textContent = String(str ?? "")
    return div.innerHTML
}

const formatDate = (ts) => {
    const d = new Date(ts)
    return d.toLocaleString("es-MX", { dateStyle: "medium" })
}

class Tarea {
    constructor(nombre, estado = "pendiente", id = makeId(), fecha = Date.now()) {
        this.id = id
        this.nombre = String(nombre ?? "")
        this.estado = estado === "completada" ? "completada" : "pendiente"
        this.fecha = fecha
    }

    toggle() {
        this.estado = this.estado === "completada" ? "pendiente" : "completada"
    }

    editar(nuevoNombre) {
        this.nombre = String(nuevoNombre ?? "")
    }

    toJSON() {
        return {
            id: this.id,
            nombre: this.nombre,
            estado: this.estado,
            fecha: this.fecha
        }
    }

    static fromJSON(obj) {
        const nombre = typeof obj?.nombre === "string" ? obj.nombre : ""
        const estado = obj?.estado === "completada" ? "completada" : "pendiente"
        const id = typeof obj?.id === "string" && obj.id ? obj.id : makeId()
        const fecha = typeof obj?.fecha === "number" ? obj.fecha : Date.now()
        return new Tarea(nombre, estado, id, fecha)
    }
}

class GestorDeTareas {
    constructor(storageKey = "totalplay_tareas") {
        this.storageKey = storageKey
        this.tareas = []
        this.filtro = "todas"
        this.cargar()
    }

    agregar(nombre, estado) {
        const t = new Tarea(nombre, estado)
        this.tareas.unshift(t)
        this.guardar()
        return t
    }

    eliminar(id) {
        const t = this.buscar(id)
        if (t) t.eliminar()
        this.tareas = this.tareas.filter(x => x.id !== id)
        this.guardar()
    }

    editar(id, nuevoNombre) {
        const t = this.buscar(id)
        if (!t) return
        t.editar(nuevoNombre)
        this.guardar()
    }

    toggle(id) {
        const t = this.buscar(id)
        if (!t) return
        t.toggle()
        this.guardar()
    }

    borrarTodo() {
        this.tareas = []
        this.guardar()
    }

    buscar(id) {
        return this.tareas.find(t => t.id === id)
    }

    obtenerFiltradas() {
        if (this.filtro === "pendientes") return this.tareas.filter(t => t.estado === "pendiente")
        if (this.filtro === "completadas") return this.tareas.filter(t => t.estado === "completada")
        return this.tareas
    }

    stats() {
        const total = this.tareas.length
        const done = this.tareas.filter(t => t.estado === "completada").length
        const pend = total - done
        return { total, done, pend }
    }

    guardar() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.tareas.map(t => t.toJSON())))
        } catch {
        }
    }

    cargar() {
        const raw = localStorage.getItem(this.storageKey)
        if (!raw) {
            this.tareas = []
            return
        }
        try {
            const arr = JSON.parse(raw)
            this.tareas = Array.isArray(arr) ? arr.map(Tarea.fromJSON) : []
        } catch {
            this.tareas = []
        }
    }
}

const validarNombre = (nombre) => {
    const limpio = String(nombre ?? "").trim()
    if (!limpio) return { ok: false, value: "" }
    return { ok: true, value: limpio }
}

const form = $("#form-tarea")
const inputNombre = $("#nombre-tarea")
const checkCompletada = $("#tarea-completa")
const lista = $("#lista-tareas")
const mensaje = $("#mensaje")
const btnLimpiar = $("#btn-limpiar")
const btnBorrarTodo = $("#btn-borrar-todo")

const statTotal = $("#stat-total")
const statPend = $("#stat-pend")
const statDone = $("#stat-done")

const chips = $$(".chip")
const gestor = new GestorDeTareas()

const showMsg = (text, type = "ok") => {
    mensaje.className = "message"
    mensaje.textContent = ""
    if (!text) return
    mensaje.classList.add(type === "error" ? "is-error" : "is-ok")
    mensaje.textContent = text
}

const closeMobileMenu = () => {
    const toggle = $("#nav-toggle")
    if (toggle && toggle.checked) toggle.checked = false
}

$$(".nav-links a").forEach(a => a.addEventListener("click", closeMobileMenu))

const templateTask = (t) => {
    const done = t.estado === "completada"
    const badgeClass = done ? "badge done" : "badge todo"
    const badgeText = done ? "Completada" : "Pendiente"
    const nameClass = done ? "task-name is-done" : "task-name"
    const actionText = done ? "Reabrir" : "Completar"
    const safeName = escapeHTML(t.nombre)
    const fecha = formatDate(t.fecha)

    return `
        <li class="task-item" data-id="${t.id}">
            <div class="task-left">
                <div class="task-topline">
                    <span class="${badgeClass}">${badgeText}</span>
                    <span class="${nameClass}" title="${safeName}">${safeName}</span>
                </div>

                <div class="task-meta">
                    <span>📅 ${fecha}</span>
                </div>

                <div class="edit-area" data-open="0"></div>
            </div>

            <div class="task-actions">
                <button type="button" class="icon-btn primary" data-action="toggle">${actionText}</button>
                <button type="button" class="icon-btn" data-action="edit">Editar</button>
                <button type="button" class="icon-btn danger" data-action="delete">Eliminar</button>
            </div>
        </li>
    `
}

const render = () => {
    const tasks = gestor.obtenerFiltradas()
    const { total, done, pend } = gestor.stats()

    statTotal.textContent = String(total)
    statDone.textContent = String(done)
    statPend.textContent = String(pend)

    if (tasks.length === 0) {
        lista.innerHTML = `
            <li class="task-item">
                <div class="task-left">
                    <div class="task-topline">
                        <span class="badge todo">Sin tareas</span>
                        <span class="task-name">Agrega una tarea para comenzar</span>
                    </div>
                    <div class="task-meta">
                        <span>Estados: Pendiente / Completada.</span>
                    </div>
                </div>
            </li>
        `
        return
    }

    lista.innerHTML = tasks.map(templateTask).join("")
}

const resetForm = () => {
    form.reset()
    inputNombre.focus()
}

const openEditor = (li, tarea) => {
    const area = $(".edit-area", li)
    if (!area) return
    if (area.dataset.open === "1") return

    area.dataset.open = "1"
    area.innerHTML = `
        <div class="edit-row">
            <input type="text" aria-label="Editar tarea">
            <div class="task-actions">
                <button type="button" class="icon-btn primary" data-action="save">Guardar</button>
                <button type="button" class="icon-btn" data-action="cancel">Cancelar</button>
            </div>
        </div>
    `
    const inp = $("input", area)
    if (inp) {
        inp.value = String(tarea.nombre ?? "")
        inp.focus()
        inp.setSelectionRange(inp.value.length, inp.value.length)
    }
}

const closeEditor = (li) => {
    const area = $(".edit-area", li)
    if (!area) return
    area.dataset.open = "0"
    area.innerHTML = ""
}

form.addEventListener("submit", (e) => {
    e.preventDefault()
    showMsg("")

    const { ok, value } = validarNombre(inputNombre.value)
    if (!ok) {
        showMsg("No puedes agregar una tarea vacía.", "error")
        inputNombre.focus()
        return
    }

    const estado = checkCompletada.checked ? "completada" : "pendiente"
    gestor.agregar(value, estado)
    render()
    resetForm()
    showMsg("Tarea agregada correctamente.", "ok")
})

btnLimpiar.addEventListener("click", () => {
    showMsg("")
    resetForm()
})

btnBorrarTodo.addEventListener("click", () => {
    showMsg("")
    if (gestor.tareas.length === 0) {
        showMsg("No hay tareas para eliminar.", "error")
        return
    }
    gestor.borrarTodo()
    render()
    showMsg("Se eliminaron todas las tareas.", "ok")
})

chips.forEach(chip => {
    chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("is-active"))
        chip.classList.add("is-active")
        gestor.filtro = chip.dataset.filter
        showMsg("")
        render()
    })
})

lista.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]")
    if (!btn) return

    const li = e.target.closest("li[data-id]")
    if (!li) return

    const id = li.dataset.id
    const action = btn.dataset.action
    const tarea = gestor.buscar(id)
    if (!tarea) return

    showMsg("")

    if (action === "toggle") {
        gestor.toggle(id)
        render()
        const now = gestor.buscar(id)
        showMsg(now && now.estado === "completada" ? "Marcada como completada." : "Marcada como pendiente.", "ok")
        return
    }

    if (action === "delete") {
        gestor.eliminar(id)
        render()
        showMsg("Tarea eliminada.", "ok")
        return
    }

    if (action === "edit") {
        openEditor(li, tarea)
        return
    }

    if (action === "cancel") {
        closeEditor(li)
        return
    }

    if (action === "save") {
        const inp = $(".edit-area input", li)
        const { ok, value } = validarNombre(inp ? inp.value : "")
        if (!ok) {
            showMsg("El nombre editado no puede estar vacío.", "error")
            if (inp) inp.focus()
            return
        }
        gestor.editar(id, value)
        render()
        showMsg("Tarea actualizada.", "ok")
        return
    }
})

lista.addEventListener("keydown", (e) => {
    const li = e.target.closest("li[data-id]")
    if (!li) return
    const inp = e.target.closest(".edit-area input")
    if (!inp) return

    if (e.key === "Enter") {
        e.preventDefault()
        const save = li.querySelector('button[data-action="save"]')
        if (save) save.click()
    }

    if (e.key === "Escape") {
        e.preventDefault()
        const cancel = li.querySelector('button[data-action="cancel"]')
        if (cancel) cancel.click()
    }
})

render()
