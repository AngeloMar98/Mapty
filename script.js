'use strict';

// prettier-ignore

const form = document.querySelector('.form__type');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const inputSort = document.querySelector(`.form__input--sort`);
const resetButton = document.querySelector(`.reset__btn`);

// empty but filled when the map is clicked each time

// L'oggetto viene creato e la prima cosa che succede è che il costruttore viene chiamato, il costruttore fa le cose FONDAMENTALI, cioè quello che non riguarda l'interazione dell'utente. In questo caricare la mappa alla posizione dell'utente e assegnare gli event listener. Il resto dell'oggetto è una serie di funzioni privati che costruiscono tutte le varie funzioni necessarie, che vengono chiamate nell'ordine organizzato nella flowchart

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  // settato qui ma usato nei figli
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description =
      this.type[0].toUpperCase() +
      this.type.slice(1) +
      ` on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
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
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run1 = new Running([0, 50], 100, 24, 178);
const cycl1 = new Cycling([0, 50], 89, 17, 555);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  // it's a map because it needs to specify the different marker from one another
  #markers = new Map();

  constructor() {
    // get data from locale storage
    this._getLocaleStorage();

    this._getPosition();

    // it's fine to set it permanently because the form is hidden normally
    form.addEventListener(`submit`, this._newWorkout.bind(this));

    inputType.addEventListener(`change`, this._toggleElevationField);

    inputSort.addEventListener(`change`, this._sortWorkouts.bind(this));

    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));

    resetButton.addEventListener('click', this.reset.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert(`Could not get your position`)
      );
    }
  }

  _loadMap(position) {
    // set map into view of the user position
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // add style to map
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // assign event on the map
    this.#map.on(`click`, this._showForm.bind(this));

    // this part needs the map to be loaded, otherwise it'll give errors

    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // clear input fields and remove it
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        ``;

    // just so the transition animation doesn't happen, we remove it using inline style
    form.style.display = `none`;
    form.classList.add('hidden');

    // then set it back to avoid handling it later
    setTimeout(() => (form.style.display = `grid`), 1000);
  }

  _toggleElevationField() {
    // change the form based on user input
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();

    // verify if the data is valid
    let errorMessageField = -1;
    const inputFields = [`Distance`, `Duration`];

    const validInputs = (...inputs) =>
      inputs.every(input => {
        errorMessageField++;
        return Number.isFinite(input);
      });

    const allPositive = (...inputs) => inputs.every(input => input > 0);

    // store the data into usable variables

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    // create the object workout, that has everything we need in a perfect format

    let workout;

    if (type == `running`) {
      inputFields.push(`Cadence`);
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`${inputFields[errorMessageField]} not valid`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type == `cycling`) {
      inputFields.push(`Elevation`);
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert(`${inputFields[errorMessageField]} not valid`);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    console.log(workout);
    // push object in the array
    this.#workouts.push(workout);

    //lastly render the marker
    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);
  }

  // render workout marker on map

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 250,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`
      )
      .openPopup();

    this.#markers.set(workout.id, marker);
  }

  // render workout list
  _renderWorkout(workout, sorting = false) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}
           <span class="workout__icon delete__icon">🗑</span> 
            </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? `🏃‍♂️` : `🚴‍♀️`
            }</span>
            <span class="workout__value" data-value="distance">
            ${workout.distance}</span>
            <span class="workout__unit">km</span>             
                             
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value" data-value="duration">
            ${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value  workout__pace">${workout.pace.toFixed(
              1
            )}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value" data-value="cadence">
            ${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (workout.type === `cycling`) {
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value workout__speed">${workout.speed.toFixed(
              1
            )}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value" data-value="elevationGain">${
              workout.elevationGain
            }</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }

    // inject it into the html file

    form.insertAdjacentHTML(`afterend`, html);

    document
      .querySelector('.delete__icon')
      .addEventListener('click', this._deleteWorkout.bind(this));

    document
      .querySelector(`.workout`)
      .addEventListener('click', this._editWorkout.bind(this));

    this._hideForm();

    // set local storage

    if (!sorting) {
      this._setLocaleStorage();
    }
  }

  _deleteWorkout(e) {
    // target the entire list element
    const workout = e.target.closest(`.workout`);

    // filter it from the array now that has been removed
    this.#workouts = this.#workouts.filter(el => el.id !== workout.dataset.id);
    this.#map.removeLayer(this.#markers.get(workout.dataset.id));
    this.#markers.delete(workout.dataset.id);
    workout.remove();

    // make sure the local storage doesn't keep it saved

    this._setLocaleStorage();
  }

  _setLocaleStorage() {
    // likewise, since workouts keeps even the previous data, local storage gets to keep memory of everything

    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocaleStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));

    if (!data) return;

    // add to the array the previous data, otherwise it gets reset every time coords, distance, duration, cadence

    data.forEach(workout => {
      let newWorkout;

      if (workout.type === `running`)
        newWorkout = new Running(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.cadence
        );
      else if (workout.type === `cycling`)
        newWorkout = new Cycling(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.elevationGain
        );

      this.#workouts.push(newWorkout);
    });

    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);

    // guard clause
    if (!workoutEl || e.target.closest('.delete__icon')) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _editWorkout(e) {
    // first of all we take the workout in its entirety since we'll need to query select different elements
    const currentWorkout = e.target.closest(`.workout`);

    // we need just clicks that happen close to the values we need to modify, discard everything else with a guard clause
    if (!e.target.closest(`.workout__details`)) return;

    // redirect the click to the closest workout value
    const workoutValue = e.target
      .closest(`.workout__details`)
      .querySelector(`.workout__value`);

    // take the ID so we can update the array in tandem
    const currentID = e.target.closest(`.workout`).dataset.id;

    // using this guard clause prevents the input field from being emptied
    if (
      workoutValue.querySelector(`.workout__field`) ||
      !workoutValue.dataset.value
    )
      return;

    // mutate the content from simple text to input field, so the user can give new values, type set to number otherwise it would pick up any digit
    workoutValue.innerHTML =
      '<input class="workout__field"  value="' +
      workoutValue.innerText +
      '" type="number" min="1" max="9999">';

    const workoutField = workoutValue.querySelector(`.workout__field`);
    // we use this event handler so that we can update the list element AND the array just when enter is pressed
    workoutValue.addEventListener('keypress', e => {
      // pick the workout entry from the array, by using the ID both the list element and the array entry have in common
      const workout = this.#workouts.find(workout => workout.id === currentID);

      // guard clause so it won't exceed in value that would destroy the layout
      if (workoutField.value.length > 4) e.preventDefault();

      if (e.key === 'Enter') {
        // return back from the input field to text content
        workoutValue.innerHTML = `${workoutField.value}`;

        // update the value of the specific entry property to user input
        workout[`${workoutValue.dataset.value}`] = workoutValue.innerText;

        // ####  IMPORTANT
        // since it's all handled differently from creating workouts, we NEED to save into the local storage
        this._setLocaleStorage();

        // it would normally update simply on reload, but it's far more classy to update the pace/speed irl
        if (workout.type === `running`) {
          workout.calcPace();

          currentWorkout.querySelector(`.workout__pace`).innerText =
            workout.pace.toFixed(1);
        }
        if (workout.type === `cycling`) {
          workout.calcSpeed();
          currentWorkout.querySelector(`.workout__speed`).innerText =
            workout.speed.toFixed(1);
        }
      }
    });
  }

  _sortWorkouts() {
    // first of all make a copy of the array, since some methods mutate it
    let workoutsCopy = [...this.#workouts];

    switch (inputSort.value) {
      // sort by time is just the order in which the elements are pushed
      case `time`:
        workoutsCopy = [...this.#workouts];
        break;
      case `distance`:
        // sort by distance using the distance property of the objects
        workoutsCopy.sort(
          (workout1, workout2) => workout1.distance - workout2.distance
        );
        break;
      case `duration`:
        // sort by duration uses duration
        workoutsCopy.sort(
          (workout1, workout2) => workout1.duration - workout2.duration
        );
        break;
      case `type`:
        // we create two arrays and merge them, it might be more troublesome if there were more types but in that case we could just save every type in array and filter using each entry in that array
        workoutsCopy = [
          ...this.#workouts.filter(workout => workout.type === `running`),
          ...this.#workouts.filter(workout => workout.type === `cycling`),
        ];
        break;
    }

    containerWorkouts
      .querySelectorAll(`.workout`)
      .forEach(workout => workout.remove());

    workoutsCopy.forEach(workout => {
      this._renderWorkout(workout, true);
    });
  }

  reset() {
    if (this.#workouts.length === 0) return;
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
