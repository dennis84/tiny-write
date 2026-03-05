import {SvgIcon} from './Style'

const spinnerStyle = `.spinner_P7sC{transform-origin:center;animation:spinner_svv2 .75s infinite linear}@keyframes spinner_svv2{100%{transform:rotate(360deg)}}`
export const Spinner = () => (
  <SvgIcon>
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <title>...</title>
      <style>{spinnerStyle}</style>
      <path
        fill="currentColor"
        d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
        class="spinner_P7sC"
      />
    </svg>
  </SvgIcon>
)
