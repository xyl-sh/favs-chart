const margin = 5;
const boxWidth = 185;
const boxHeight = 225;
const textHeight = 45;
const textY = boxHeight + margin * 2;
const totalWidth = boxWidth + margin * 2;
const totalHeight = boxHeight + textHeight + margin * 3;
const headerHeight = 100;
const aspectRatio = boxWidth / boxHeight;
const defaultColumns = 7;
const defaultRows = 4;
const defaultTitle = "Anon's Favourite...";
const defaultFields = [
	[
		"vidya",
		"movie",
		"music artist",
		"album",
		"tv",
		"instrument",
		"visual artist",
	],
	["pokémon", "book", "weapon", "pony", "drink", "sport", "boy/girl type"],
	[
		"superhero",
		"cartoon",
		"vehicle",
		"celebrity",
		"food",
		"activity",
		"universe",
	],
	["drug", "youtube", "comedian", "anime", "place", "animal", "retro vidya"],
];
const templateDefaults = { entries: {} };

const isSafari =
	/^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
	typeof window.webkitIndexedDB === "object";

const boxTemplate = document.createElement("template");
boxTemplate.innerHTML = String.raw`
<svg>
  <g class="box">
    <rect width="${totalWidth}" height="${totalHeight}" />
    <g class="content-container" transform="translate(${margin}, ${margin})">
      <rect width="${boxWidth}" height="${boxHeight}" />
      <image preserveAspectRatio="xMidYMid slice" width="${boxWidth}" height="${boxHeight}" image-rendering="optimizeSpeed"></image>
      <text
        x="${boxWidth / 2}"
        y="${boxHeight / 2}"
        class="content"
        data-default-rem="3"></text>
    </g>
    <g class="label-container changeable" transform="translate(${margin}, ${textY})">
      <rect width="${boxWidth}" height="${textHeight}" />
      <text
        x="${boxWidth / 2}"
        y="${textHeight / 2}"
        class="label"></text>
    </g>
  </g>
</svg>
`;

function fileToDataURL(file) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(file);
	});
}

function scaleText(e, timeout = false) {
	if (!timeout) {
		setTimeout(() => scaleText(e, true), 10);
		return;
	}

	const defaultRem = Number(e.dataset.defaultRem || 2);

	const rect = e.parentElement.querySelector("rect");
	const rectBox = rect.getBBox();

	e.style.fontSize = `${defaultRem}rem`;
	const textBox = e.getBBox();
	if (textBox.width <= rectBox.width && textBox.height <= rectBox.height) {
		return;
	}

	const emScale = Math.min(
		rectBox.width / textBox.width,
		rectBox.height / textBox.height,
	);

	e.style.fontSize = `${defaultRem * emScale}rem`;
}

function setLabel(t) {
	const textElem = t.closest("g").querySelector("text");
	// eslint-disable-next-line no-alert
	const newText = prompt("Change text:", textElem.textContent);
	if (newText === null) {
		return;
	}
	textElem.textContent = newText;
	scaleText(textElem);
}

function setText() {
	const dialog = document.querySelector("#slot-modal");
	const element = document.querySelector(
		`[data-slot="${dialog.dataset.selectedSlot}"] .content`,
	);

	const text = document.querySelector("dialog #text-field").value.trim();
	let words = text.split(/\s/);
	const longestWord = Math.max(...words.map((w) => w.length), 5);
	words.forEach((w, i) => {
		if (i + 1 >= words.length) {
			return;
		}
		if (w.length + words[i + 1].length + 1 <= longestWord) {
			words[i + 1] = `${w} ${words[i + 1]}`;
			words[i] = null;
		}
	});
	words = words.filter((t) => t);
	const tspans = words.map((t, i) => {
		const tspan = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"tspan",
		);
		tspan.setAttribute("x", boxWidth / 2);
		tspan.setAttribute("alignment-baseline", "central");

		tspan.textContent = t;
		if (!i) {
			tspan.setAttribute("dy", `-${1.2 * ((words.length - 1) / 2)}em`);
		} else {
			tspan.setAttribute("dy", "1.2em");
		}
		return tspan;
	});

	element.replaceChildren(...tspans);
	scaleText(element);

	dialog.close();
}

async function updateImage(data, elem) {
	try {
		if (!data.files[0].type.startsWith("image/")) {
			return;
		}
	} catch (e) {
		if (e) {
			return;
		}
	}

	const dialog = document.querySelector("#slot-modal");
	const e =
		elem ||
		document.querySelector(`[data-slot="${dialog.dataset.selectedSlot}"]`);

	const imageElem = e.closest(".box").querySelector("image");
	const file = data.files[0];

	const image = new Image();
	image.onload = () => {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const imgAspect = image.naturalWidth / image.naturalHeight;
		const width = imgAspect < aspectRatio ? boxWidth : boxHeight * imgAspect;
		const height = imgAspect < aspectRatio ? boxWidth / imgAspect : boxHeight;
		canvas.width = width;
		canvas.height = height;
		ctx.drawImage(image, 0, 0, width, height);
		imageElem.setAttribute("href", canvas.toDataURL("image/png"));
		dialog.close();
	};

	image.src = await fileToDataURL(file);
}

function scalingChanged(e) {
	e.parentElement
		.querySelectorAll("button")
		.forEach((b) => b.classList.remove("selected"));
	e.classList.add("selected");

	const dialog = e.closest("dialog");
	const newString = `xMidYMid ${e.dataset.type === "fit" ? "meet" : "slice"}`;
	const svg = document.querySelector("svg");
	if (dialog) {
		const target = svg.querySelector(
			`[data-slot="${dialog.dataset.selectedSlot}"] image`,
		);
		target.setAttribute("preserveAspectRatio", newString);
		target.classList.add("modified");
	} else {
		svg.querySelectorAll("image:not(.modified)").forEach((i) => {
			i.setAttribute("preserveAspectRatio", newString);
		});
	}
}

function resetBox(t) {
	const dialog = t.closest("dialog");
	const slot = dialog.dataset.selectedSlot;

	const element = document.querySelector(`[data-slot="${slot}"] .content`);
	element.textContent = "";
	scaleText(element);

	const img = document.querySelector(`[data-slot="${slot}"] image`);
	img.removeAttribute("href");
	img.classList.remove("modified");
	document.querySelector(".scaling-choice .selected").click();
	dialog.close();
}

function render(image, width, height, button) {
	const b = button;
	const renderCanvas = document.createElement("canvas");
	const renderContext = renderCanvas.getContext("2d");
	renderCanvas.width = width;
	renderCanvas.height = height;
	renderContext.drawImage(image, 0, 0, width, height);

	URL.revokeObjectURL(image.src);

	const link = document.createElement("a");
	link.setAttribute("download", "favchart.png");
	link.setAttribute(
		"href",
		renderCanvas
			.toDataURL("image/png")
			.replace("image/png", "image/octet-stream"),
	);
	link.click();
	b.removeAttribute("disabled");
	b.textContent = "Download Image";
}

function save(button, retried = false) {
	const b = button;
	b.textContent = "...";
	b.setAttribute("disabled", true);

	const renderImage = new Image();

	document.querySelectorAll("svg input").forEach((e) => {
		e.setAttribute("value", e.value);
	});

	const svg = document.querySelector("svg");
	const { width } = svg.viewBox.baseVal;
	const { height } = svg.viewBox.baseVal;

	const svgURL = new XMLSerializer().serializeToString(svg);
	const svgBlob = new Blob([svgURL], { type: "image/svg+xml" });
	const objUrl = URL.createObjectURL(svgBlob);

	renderImage.onload = () => {
		if (isSafari && !retried) {
			URL.revokeObjectURL(objUrl);
			save(button, true);
			return;
		}
		render(renderImage, width, height, button);
	};

	renderImage.src = objUrl;
}

function showModal(e) {
	const dialog = document.querySelector("dialog");
	const box = e.closest("[data-slot]");
	dialog.dataset.selectedSlot = box.dataset.slot;

	dialog.querySelector("h2").textContent =
		box.querySelector(".label").textContent;
	dialog.querySelector("#text-field").value = [
		...box.querySelectorAll(".content tspan"),
	]
		.map((t) => t.textContent)
		.join(" ");

	const isFit = box
		.querySelector(`image`)
		.getAttribute("preserveAspectRatio")
		.includes("meet");

	dialog
		.querySelectorAll("button")
		.forEach((b) => b.classList.remove("selected"));

	dialog
		.querySelector(`button[data-type=${isFit ? "fit" : "fill"}]`)
		.classList.add("selected");

	dialog.showModal();
}

function setSvgHeight() {
	if (!isSafari) {
		return;
	}

	const svg = document.querySelector("svg");
	svg.classList.add("use-height");
	if (svg.clientWidth > svg.parentElement.clientWidth) {
		svg.classList.remove("use-height");
	}
}

function genBoxes(columns, rows) {
	const width = totalWidth * columns + margin * (columns + 1);
	const height = totalHeight * rows + margin * (rows + 1) + headerHeight;
	const resizeObserver = new ResizeObserver((entries, observer) => {
		entries.forEach((e) => {
			const rect = e.target;
			const rectBox = rect.getBBox();
			if (
				rectBox.width !== Number(rect.getAttribute("width")) ||
				rectBox.height !== Number(rect.getAttribute("height"))
			) {
				return;
			}
			observer.unobserve(rect);
			scaleText(rect.parentElement.querySelector("text"));
		});
	});

	const svg = document.querySelector("svg");
	svg.dataset.rows = rows;
	svg.dataset.columns = columns;

	svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
	svg.style.setProperty("--svg-height", `${height}px`);

	setSvgHeight();

	const mainRect = svg.querySelector("svg > rect");
	mainRect.setAttribute("width", width);
	mainRect.setAttribute("height", height);

	const headerElem = svg.querySelector(".header");
	if (!headerElem.getAttribute("height")) {
		const headerRect = svg.querySelector(".header-container rect");
		headerRect.setAttribute("height", headerHeight);
		headerRect.setAttribute("width", width);
		headerElem.setAttribute("y", headerHeight / 2);
		headerElem.setAttribute("x", width / 2);
		resizeObserver.observe(headerRect);
		headerElem.textContent = templateDefaults.t || defaultTitle;
		headerElem.dataset.defaultRem = 4;
	}

	const containerElem = svg.querySelector("#container");
	if (!containerElem.getAttribute("transform")) {
		containerElem.setAttribute("transform", `translate(0, ${headerHeight})`);
		containerElem.style.setProperty("--box-height", `${boxHeight}px`);
	}

	const totalBoxes = rows * columns;
	Array(totalBoxes)
		.fill(0)
		.forEach((_, i) => {
			const r = Math.floor(i / columns);
			const c = i % columns;

			const existingElem = svg.querySelector(`.box[data-slot="${r}_${c}"]`);
			if (existingElem) {
				return;
			}

			const x = margin + c * margin + c * totalWidth;
			const y = margin + r * margin + r * totalHeight;

			let label;
			try {
				label = templateDefaults.entries[`${r}_${c}`] || defaultFields[r][c];
			} catch (e) {
				if (e) {
					label = "";
				}
			}

			const boxElem = boxTemplate.content.querySelector("g").cloneNode(true);
			boxElem.dataset.slot = `${r}_${c}`;
			boxElem.setAttribute("transform", `translate(${x}, ${y})`);

			const boxLabel = boxElem.querySelector(".label");
			resizeObserver.observe(boxElem.querySelector(".label-container rect"));
			boxLabel.textContent = label;

			containerElem.appendChild(boxElem);
		});
}

function updateBoxes() {
	const columns = document.querySelector("#columns-input").value;
	const rows = document.querySelector("#rows-input").value;
	genBoxes(Number(columns), Number(rows));
}

function getDefaultFromParam(value, key) {
	switch (key) {
		case "c":
			templateDefaults.c = Number(value);
			break;
		case "r":
			templateDefaults.r = Number(value);
			break;
		case "t":
			templateDefaults.t = value;
			break;
		default:
			if (key.match(/\d*_\d*/)) {
				templateDefaults.entries[key] = value;
			}
			break;
	}
}

function getDefaults() {
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.length === 0) {
		return;
	}

	const template = urlParams.get("template");
	if (template) {
		Object.entries(JSON.parse(atob(template))).forEach((k, v) => {
			templateDefaults[k] = v;
		});
	} else {
		urlParams.forEach((v, k) => getDefaultFromParam(v, k));
	}

	if (templateDefaults.c) {
		document.querySelector("#columns-input").value = templateDefaults.c;
	}
	if (templateDefaults.r) {
		document.querySelector("#rows-input").value = templateDefaults.r;
	}
}

async function exportTemplate() {
	const template = {};
	const urlParams = new URLSearchParams();
	const svg = document.querySelector("svg");
	const columns = Number(svg.dataset.columns);
	if (defaultColumns !== columns) {
		urlParams.append("c", columns);
		template.c = columns;
	}
	const rows = Number(svg.dataset.rows);
	if (defaultRows !== rows) {
		urlParams.append("r", rows);
		template.r = rows;
	}
	const title = svg.querySelector(".header-container > text").textContent;
	if (defaultTitle !== title) {
		urlParams.append("t", title);
		template.t = title;
	}

	const entries = {};
	svg.querySelectorAll("[data-slot]").forEach((b) => {
		const id = b.dataset.slot;
		const row = Number(id.split("_")[0]);
		const column = Number(id.split("_")[1]);

		const value = b.querySelector(".label").textContent.trim().toLowerCase();
		if (row + 1 > rows || column + 1 > columns || !value) {
			return;
		}
		let defaultValue;
		try {
			defaultValue = defaultFields[row][column].trim().toLowerCase();
		} catch (e) {
			if (e) {
				defaultValue = "";
			}
		}
		if (value === defaultValue) {
			return;
		}
		urlParams.append(id, value);
		entries[id] = value;
	});

	if (Object.keys(entries).length) {
		template.entries = entries;
	}

	const url = `${window.location.origin}${
		window.location.pathname
	}?${urlParams.toString()}`;
	window.history.replaceState({}, "", url);
	await navigator.clipboard.writeText(url);
}

async function getSvgExtras() {
	const svg = document.querySelector("svg");
	let css = await (await fetch("/resources/svg.css")).text();
	const urls = [...new Set(css.match(/(?<=url\(['"`]).*?(?=['"`]\))/gi) || [])];

	await Promise.all(
		urls.map(async (u) => {
			const font = await (await fetch(u)).blob();
			const base64 = await fileToDataURL(font);
			css = css.replaceAll(u, base64);
		}),
	);

	const style = document.createElement("style");
	style.textContent = css;
	svg.appendChild(style);
}

document.addEventListener("DOMContentLoaded", async () => {
	await getSvgExtras();
	getDefaults();
	genBoxes(
		templateDefaults.c || defaultColumns,
		templateDefaults.r || defaultRows,
	);
});

document.addEventListener("change", (e) => {
	const t = e.target;
	if (t.matches("#select-file")) {
		updateImage(t);
	}
});

document.addEventListener("click", (e) => {
	const t = e.target;
	if (t.closest("dialog") && !t.closest("#modal-bounds")) {
		document.querySelectorAll("dialog").forEach((d) => d.close());
	}

	switch (t.id) {
		case "save-button":
			save(t);
			return;
		case "dimensions-button":
			updateBoxes(t);
			return;
		case "template-button":
			exportTemplate();
			return;
		case "set-text":
			setText(t);
			return;
		case "reset-button":
			resetBox(t);
			return;
		case "close-modal":
			t.closest("dialog").close();
			return;
		default:
			break;
	}

	if (t.closest(".content, .content-container")) {
		showModal(t.closest(".box"));
	} else if (t.closest(".scaling-choice")) {
		scalingChanged(t);
	} else if (t.closest(".changeable")) {
		setLabel(t);
	}
});

document.addEventListener("dragover", (e) => {
	e.preventDefault();
});

document.addEventListener("drop", (e) => {
	const t = e.target;
	e.preventDefault();
	if (t.closest("svg .box")) {
		updateImage(e.dataTransfer, t);
	}
});

document.addEventListener("paste", (e) => {
	if (
		!document.querySelector("#slot-modal[open]") ||
		!e.clipboardData.files.length
	) {
		return;
	}

	e.preventDefault();
	updateImage(e.clipboardData);
});

window.addEventListener("beforeunload", (e) => {
	if (document.querySelector("img[src]")) {
		e.preventDefault();
	}
});

window.addEventListener("resize", setSvgHeight);
