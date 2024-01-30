import { component$, sync$ } from "@builder.io/qwik";

export default component$(() => {
  return (
    <div class="p-5">
      <h1 class="text-2xl">Form validation</h1>
      <form
        class="mt-5 w-60"
        preventdefault:submit
        onSubmit$={(e, formElement) => {
          formElement.setAttribute("data-was-submitted", "");

          formElement.querySelectorAll("input").forEach((input) => {
            input.dispatchEvent(new Event("input"));
          });
          if (!formElement.checkValidity()) return;

          const { year, ...data } = Object.fromEntries(
            new FormData(formElement),
          );
          console.log({ ...data, year: Number(year) });
        }}
      >
        <label>
          Name
          <input
            type="text"
            name="name"
            class="peer w-full rounded px-2 py-1 ring-1 ring-inset ring-sky-400 invalid:ring-orange-400 focus:outline-none focus:ring-2 focus:ring-sky-600 invalid:focus:ring-orange-600"
            onInput$={sync$((e: InputEvent, target: HTMLInputElement) => {
              if (!(target.form?.hasAttribute("data-was-submitted") ?? false))
                return;

              if (
                target.value.trim().length === 0 ||
                !target.value.match(/^[A-Z].*$/)
              ) {
                target.setCustomValidity("Field is invalid");
                target.reportValidity();
              } else {
                target.setCustomValidity("");
                target.reportValidity();
              }
              target
                .form!.querySelector("input[name=year]")!
                .dispatchEvent(new Event("input"));
            })}
            preventdefault:invalid
            onInvalid$={(e, target) => {
              target.nextElementSibling!.textContent = target.validationMessage;
            }}
          />
          <span class="invisible block bg-orange-100 px-2 py-1 text-orange-400 peer-invalid:visible">
            &nbsp;
          </span>
        </label>

        <label>
          Year of birth
          <input
            type="text"
            name="year"
            class="peer w-full rounded px-2 py-1 ring-1 ring-inset ring-sky-400 invalid:ring-orange-400 focus:outline-none focus:ring-2 focus:ring-sky-600 invalid:focus:ring-orange-600"
            onInput$={sync$((e: InputEvent, target: HTMLInputElement) => {
              if (!(target.form?.hasAttribute("data-was-submitted") ?? false))
                return;

              if (target.value.trim().length === 0) {
                target.setCustomValidity("Field is required");
                target.reportValidity();
              } else if (
                !target.value.match(/^\d+$/) ||
                isNaN(Number(target.value))
              ) {
                target.setCustomValidity("Field must be a number");
                target.reportValidity();
              } else if (Number(target.value) < 2000) {
                target.setCustomValidity(
                  "Number must be greater or equal than 2000",
                );
                target.reportValidity();
              } else if (
                new FormData(target.form!).get("name") === "Newborn" &&
                Number(target.value) < 2024
              ) {
                target.setCustomValidity("Newborn can not be born before 2024");
                target.reportValidity();
              } else {
                target.setCustomValidity("");
                target.reportValidity();
              }
            })}
            preventdefault:invalid
            onInvalid$={(e: InputEvent, target: HTMLInputElement) => {
              target.nextElementSibling!.textContent = target.validationMessage;
            }}
          />
          <span class="invisible block bg-orange-100 px-2 py-1 text-orange-400 peer-invalid:visible">
            &nbsp;
          </span>
        </label>

        <br />
        <button class="rounded border px-2 py-1">Submit</button>
      </form>
    </div>
  );
});
