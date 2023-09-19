"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const workoutOptions = document.getElementsByClassName("workout__options");

class Workout {
	date = new Date();
	id = (Date.now() + "").slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}

	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
			months[this.date.getMonth()]
		} ${this.date.getDate()}`;
	}
}

class Running extends Workout {
	type = "running";
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = "cycling";
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		this.speed = this.distance / this.duration / 60;
		return this.speed;
	}
}

////////////////////////////////
//Application Architecture
class App {
	#map;
	#mapEvent;
	#workouts = [];
	#mapZoomLevel = 13;

	constructor() {
		//Get user's position
		this._getPosition();

		//Get data from local storage
		this._getLocalStorage();

		// Attach Event Handlers
		form.addEventListener("submit", this._newWorkout.bind(this));
		inputType.addEventListener("change", this._toogleElevationField);
		containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

		if (workoutOptions) {
			// Add Event Listener for Edit and Delete
			workoutOptions.addEventListener("click", this._manageWorkout.bind(this));
		}
	}

	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function () {
					alert("Couldn't load position");
				}
			);
		}
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

		const coords = [latitude, longitude];
		this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

		L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		this.#map.on("click", this._showForm.bind(this));

		this.#workouts.forEach((workout) => this._renderWorkoutMarker(workout));
	}

	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove("hidden");
		inputDistance.focus();
	}

	_hideForm() {
		inputDistance.value =
			inputDuration.value =
			inputCadence.value =
			inputElevation.value =
				"";
		form.style.display = "none";
		form.classList.add("hidden");
		setTimeout(() => (form.style.display = "grid"), 1000);
	}

	_toogleElevationField() {
		inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
		inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
	}

	_newWorkout(e) {
		e.preventDefault();

		const validInputs = (...inputs) =>
			inputs.every((input) => Number.isFinite(input));

		const allPositive = (...inputs) => inputs.every((input) => input > 0);
		// Get data from the form
		const type = inputType.value;
		const duration = +inputDuration.value;
		const distance = +inputDistance.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// If workout running, create running object
		if (type === "running") {
			const cadence = +inputCadence.value;
			// Check if data is valid
			if (
				!validInputs(distance, duration, cadence) ||
				!allPositive(distance, duration, cadence)
			)
				return alert("Inputs have to be positive number!");
			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout running, create running object
		else if (type === "cycling") {
			const elevation = +inputElevation.value;
			// Check if data is valid
			if (
				!validInputs(distance, duration, elevation) ||
				!allPositive(distance, duration)
			)
				return alert("Inputs have to be positive number!");
			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add new object to workout array
		this.#workouts.push(workout);
		console.log(workout);

		// Render workout on map as marker
		this._renderWorkoutMarker(workout);

		// Render Workout on list
		this._renderWorkout(workout);

		// Hide form + clear input fields
		this._hideForm();

		// Set local storage to all workouts
		this._setLocalStorage();

		// Add Event Listener for Edit and Delete
		console.log(workoutOptions);
		workoutOptions.addEventListener("click", this._manageWorkout.bind(this));
	}

	_renderWorkoutMarker(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				})
			)
			.setPopupContent(
				`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
			)
			.openPopup();
	}

	_renderWorkout(workout) {
		let html = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
				<h2 class="workout__title">${workout.description}</h2>
				<div class="workout__options">
						<span class="material-icons workout__option workout__option--edit"
							>edit</span
						>
						<span class="material-icons workout__option workout__option--delete"
							>delete</span
						>
					</div>
				<div class="workout__details">
					<span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
					<span class="workout__value">${workout.distance}</span>
					<span class="workout__unit">km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⏱</span>
					<span class="workout__value">${workout.duration}</span>
					<span class="workout__unit">min</span>
				</div>
		`;

		if (workout.type === "running") {
			html += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.pace.toFixed(1)}</span>
					<span class="workout__unit">min/km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">🦶🏼</span>
					<span class="workout__value">${workout.cadence}</span>
					<span class="workout__unit">spm</span>
				</div>
			</li>
			`;
		} else {
			html += `
					<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
			`;
		}

		form.insertAdjacentHTML("afterend", html);
	}

	_manageWorkout(e) {
		console.log(e);
		// if (e.target.classList.contains("workout__option"))
		// 	return this._manageWorkout(e, workoutEl.dataset.id);

		// if (e.target.classList.contains("workout__option--delete")) {
		// 	if (!confirm("Remove workout?")) return;
		// 	console.log(this.#workouts);
		// 	this.#workouts.splice(
		// 		this.#workouts.find((workout) => workoutID === workout.id),
		// 		1
		// 	);
		// 	console.log(this.#workouts);

		// 	for (let workout of containerWorkouts.children) {
		// 		if (workout.getAttribute("data-id") === workoutID) {
		// 			containerWorkouts.removeChild(workout);
		// 			this._setLocalStorage();
		// 		}
		// 	}
		// }
	}

	_moveToPopup(e) {
		const workoutEl = e.target.closest(".workout");
		if (!workoutEl) return;

		const workout = this.#workouts.find(
			(workout) => workoutEl.dataset.id === workout.id
		);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	_setLocalStorage() {
		localStorage.setItem("workouts", JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem("workouts"));

		if (!data) return;
		this.#workouts = data;

		this.#workouts.forEach((workout) => this._renderWorkout(workout));
	}

	reset() {
		localStorage.removeItem("workouts");
		location.reload();
	}
}

const app = new App();
