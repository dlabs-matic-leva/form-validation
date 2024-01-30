# Form validation

I've always used react-hook-form and yup for form validation, but it feels heavy for what should be a simple feature. 
So I decided to write down list of requirements and then try to implement validation, sticking to vanilla APIs as much as possible. 
I've used Qwik and Tailwind because I wanted to take them for a spin but code should be applicable to any framework. 

## Requirements
* Don't validate until user submits the form for the first time. Then validate on every input change.
* Show error messages below the fields they are related to. 
* Field should be `:invalid` if it is invalid. 
* Parse and cast additional data types (`number`, `Date`)
* Validators can be interdependent, where value of one field depends on the value of another field.

## 1st attempt

```tsx
export default component$(() => {
  return (
    <div class="p-5">
      <h1 class="text-2xl">Form validation</h1>
      <form
        class="mt-5"
        preventdefault:submit
        onSubmit$={(e) => {
          const formElement = e.target as HTMLFormElement;
          const data = new FormData(formElement);
          console.log(Object.fromEntries(data));
        }}
      >
        <label>
          Name
          <br />
          <input
            type="text"
            name="name"
            required
            pattern="[A-Z].*"
            class={
              "rounded px-2 py-1 ring-1 ring-sky-400 invalid:ring-orange-400 focus:outline-none focus:ring-2 focus:ring-sky-600 invalid:focus:ring-orange-600"
            }
          />
        </label>

        <br />
        <button class={"mt-5 rounded border px-2 py-1"}>Submit</button>
      </form>
    </div>
  );
});
```
This is the simplest implementation, but it fails at requirement #1. Field is `:invalid` as soon as it loads. Interestingly, it doesn't show error message until user submits the form for the first time.

What if we use `novalidate` attribute on the form? 
```tsx
<form
  class="mt-5"
  preventdefault:submit
  onSubmit$={(e) => {
    const formElement = e.target as HTMLFormElement;
    const data = new FormData(formElement);
    console.log(Object.fromEntries(data));
  }}
  noValidate
>
```
No dice :(, it will disable _interactive_ validation but [won't disable](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation#sect2) _static_ validation. Field will still be eagerly :invalid. 

## 2nd attempt

What if we remove validation attributes and do it manually? 

We can use Constraint Validation API to set error message and :invalid state. We will also have to track whether user has already submitted the form or not but maybe that won't be that ugly...

```tsx
<form
  class="mt-5"
  preventdefault:submit
  onSubmit$={(e, formElement) => {
    formElement.setAttribute("data-was-submitted", "");
    formElement.querySelectorAll("input").forEach((input) => {
      input.dispatchEvent(new Event("input"));
    });
    if (!formElement.checkValidity()) return;
    const data = new FormData(formElement);
    console.log(Object.fromEntries(data));
  }}
>
```
```tsx
<input
  type="text"
  name="name"
  class={
    "rounded px-2 py-1 ring-1 ring-sky-400 invalid:ring-orange-400 focus:outline-none focus:ring-2 focus:ring-sky-600 invalid:focus:ring-orange-600"
  }
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
  })}
/>
```
Code for field doesn't look that bad. (ignore `sync$`, it's Qwik thing. Ordinarily this would be simple `onInput` handler). I also decided to set custom attribute to mark form as submitted instead of using framework specific state management. 

If you are coming from React, this would trigger all sorts of red flags (setting attributes, manually dispatching events, query selectors) but remember that I am trying to stick to vanilla JS as much as possible. If you wanted to write that code in React, you would use `useRef` to access fields and `useState` to remember state of the form.

## 3rd attempt
We still show error message in browser's popup when field is invalid but our requirement is that we show error message below the field. Luckily this is easy to add, we just need to listen to `invalid` event and set `textContent` of the error message. 

```tsx
<input
  preventdefault:invalid
  onInvalid$={(e, target) => {
    target.nextElementSibling!.textContent = target.validationMessage;
  }}
/>
<span class="invisible block bg-orange-100 px-2 py-1 text-orange-400 peer-invalid:visible">
  &nbsp;
</span>
```

Again, this is modifying DOM directly; in React this would be another `useState` hook.

## 4th attempt
We are almost there, we just need to improve our handling of special data types. If field isn't simple text input, and we expect users to enter data in certain format, I tend to mask the input so that users can't even enter data in incorrect format. (maybe something like imask.js?). Just don't use `<input type="number">` if you value your time: [[1]](https://stackoverflow.blog/2022/12/26/why-the-number-input-is-the-worst-input/), [[2]](https://www.filamentgroup.com/lab/type-number.html). In any case, field's value will still be of type `string` so we will need to parse/cast it after we get it from field. 

```tsx
<form
  preventdefault:submit
  onSubmit$={(e, formElement) => {
    formElement.setAttribute("data-was-submitted", "");
    formElement.querySelectorAll("input").forEach((input) => {
      input.dispatchEvent(new Event("input"));
    });
    if (!formElement.checkValidity()) return;
    const { name, year } = Object.fromEntries(new FormData(formElement));
    console.log({ name, year: Number(year) });
  }}
>
```
```tsx
<input
  type="text"
  name="year"
  onInput$={sync$((e: InputEvent, target: HTMLInputElement) => {
    if (!(target.form?.hasAttribute("data-was-submitted") ?? false))
      return;

    if (
      target.value.trim().length === 0 ||
      !target.value.match(/^\d+$/) ||
      Number(target.value) < 2000
    ) {
      target.setCustomValidity("Field is invalid");
      target.reportValidity();
    } else {
      target.setCustomValidity("");
      target.reportValidity();
    }
  })}
/>
```
This solution is very naive because it doesn't open numeric keyboard on mobile, for example but making robust number input is out of scope for this exploration.

## 5th attempt

One thing I was ignoring so far was error messages. In practice, we would like to show specific error messages instead of generic "Field is invalid".
```tsx
if (target.value.trim().length === 0) {
  target.setCustomValidity("Field is required");
  target.reportValidity();
} else if (!target.value.match(/^\d+$/) || isNaN(Number(target.value))) {
  target.setCustomValidity("Field must be a number");
  target.reportValidity();
} else if (Number(target.value) < 2000) {
  target.setCustomValidity("Number must be greater or equal than 2000");
  target.reportValidity();
} else {
  target.setCustomValidity("");
  target.reportValidity();
}
```
Once we split up validation, it's also easier to check values of other fields. Don't forget to trigger `input` event from `input` handlers of all dependant fields. 
```tsx
<input
  type="text"
  name="name"
  onInput$={sync$((e: InputEvent, target: HTMLInputElement) => {
    target
        .form!.querySelector("input[name=year]")!
        .dispatchEvent(new Event("input"));
  })}
/>
<input
  type="text"
  name="year"
  onInput$={sync$((e: InputEvent, target: HTMLInputElement) => {
    if (
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
/>
```
Again, accessing values of inputs directly is anti-pattern in React land (and probably every other FE framework, too). In React you would use `useState` to store values of fields and compare against these stored values.

## Conclusion

Damn, that's a lot of code. I mean, it wasn't hard to implement, but it was a lot of code just for 2 fields. Now imagine writing that for 10+ fields and with more complex validation rules... I see the value of react-hook-form and yup now. Complete example is in [`/src/routes/index.tsx`](src/routes/index.tsx)