import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import Turnstile from "../Turnstile";

const inputClass = "h-9 w-full rounded-md border border-border bg-search px-3 outline-none focus:border-muted-foreground/40";

export default function AuthPage({ signup }: { signup?: boolean }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);
  const submit = () => {
    if (!token) return;
    (signup
      ? api.signup({ first_name: firstName, last_name: lastName, email, password, turnstile: token })
      : api.signin({ email, password, turnstile: token })
    ).then((row) => {
      if (row.message) {
        setError(row.message);
        setReset((count) => count + 1);
        return;
      }
      navigate("/dashboard");
    });
  };

  return (
    <main className="page-fade mx-auto flex min-h-screen w-[min(480px,calc(100%-48px))] flex-col justify-center py-10">
      <Link to="/" className="mb-6 flex items-center justify-center gap-3 text-lg font-bold tracking-tight hover:no-underline">
        <svg className="box-content h-7 w-7 border-r border-border pr-3" viewBox="470 265 600 480" fill="currentColor">
          <path fillRule="evenodd" d="M 478.643 274.659 C 480.554 279.200, 496.432 321.938, 505.705 347.500 L 512.235 365.500 511.585 386.500 C 511.227 398.050, 510.061 428.200, 508.993 453.500 C 504.700 555.231, 499.010 709.984, 499.004 725.216 L 499 734.933 511.112 726.216 C 541.952 704.021, 566.229 686.466, 585.930 672.113 C 621.129 646.468, 629.472 640.425, 658.630 619.462 C 692.910 594.815, 699.906 589.651, 699.959 588.958 C 699.982 588.659, 695.805 582.134, 690.677 574.458 C 685.549 566.781, 679.551 557.800, 677.347 554.500 C 675.144 551.200, 669.385 542.425, 664.550 535 C 659.715 527.575, 652.185 516.207, 647.816 509.739 L 639.874 497.977 643.167 495.239 C 644.979 493.732, 652.688 487.100, 660.300 480.500 C 667.911 473.900, 676.286 466.700, 678.912 464.500 C 688.607 456.375, 705.697 441.481, 712.245 435.448 L 718.990 429.234 674.245 399.747 C 649.635 383.529, 618.250 362.851, 604.500 353.796 C 590.750 344.741, 568.925 330.358, 556 321.834 C 514.600 294.529, 491.128 279.323, 480.263 272.770 L 477.026 270.818 478.643 274.659 M 1045.466 322.220 C 1027.077 338.132, 1003.309 358.921, 986.037 374.198 L 971.213 387.311 966.188 407.406 C 948.789 476.984, 926.008 566.855, 925.273 568.819 C 924.292 571.440, 927.300 574.698, 882.580 522.580 C 879.786 519.324, 873.065 511.771, 867.645 505.795 C 859.174 496.454, 857.573 495.109, 856.238 496.214 C 854.378 497.754, 824.901 530.228, 801.878 556.100 L 785.326 574.701 781.694 561.100 C 779.696 553.620, 775.744 538.050, 772.911 526.500 C 768.491 508.478, 750.270 435.751, 749.697 433.842 C 749.310 432.552, 721.685 455.386, 686.163 486.359 C 681.027 490.836, 676.190 494.860, 675.413 495.300 C 673.368 496.457, 673.618 497.498, 677.326 503.298 C 679.156 506.159, 683.141 512.775, 686.183 518 C 689.225 523.225, 696.886 536.050, 703.209 546.500 C 709.531 556.950, 719.345 573.375, 725.019 583 C 730.692 592.625, 743.291 613.775, 753.016 630 C 762.741 646.225, 773.950 665.049, 777.926 671.830 L 785.155 684.160 789.828 678.204 C 792.397 674.928, 802.395 662.404, 812.045 650.374 C 831.261 626.416, 849.945 602.695, 854.256 596.781 C 855.772 594.701, 857.402 593, 857.878 593 C 858.354 593, 862.810 598.063, 867.780 604.250 C 872.750 610.438, 881.020 620.499, 886.158 626.608 C 891.296 632.718, 908.166 652.829, 923.647 671.300 L 951.794 704.884 954.935 693.692 C 956.662 687.536, 966.177 652.800, 976.078 616.500 C 985.979 580.200, 998.755 533.400, 1004.467 512.500 C 1020.710 453.076, 1043.796 367.437, 1052.990 332.500 C 1054.727 325.900, 1056.766 318.363, 1057.520 315.750 C 1058.275 313.137, 1058.788 311, 1058.662 311 C 1058.535 311, 1052.597 316.049, 1045.466 322.220 M 567.381 440.960 C 567.494 466.788, 567.792 488.125, 568.043 488.376 C 568.533 488.866, 582.577 477.115, 598.969 462.500 C 604.521 457.550, 611.412 451.526, 614.282 449.113 C 621.465 443.073, 629.196 435.851, 628.815 435.537 C 628.458 435.242, 612.971 424.676, 599.500 415.538 C 594.550 412.180, 585.486 405.960, 579.359 401.716 C 573.231 397.472, 567.983 394, 567.696 394 C 567.409 394, 567.267 415.132, 567.381 440.960 M 567.678 522.396 C 567.386 523.157, 567.126 545.502, 567.101 572.051 L 567.054 620.322 569.777 617.814 C 572.950 614.892, 592.089 598.324, 599.020 592.500 C 617.065 577.338, 622.598 572.674, 623.301 572.030 C 623.742 571.627, 617.462 565.268, 609.345 557.899 C 601.228 550.529, 589.854 540.071, 584.068 534.658 C 571.044 522.471, 568.407 520.498, 567.678 522.396" />
        </svg>
        Binwoken
      </Link>
      <section className="panel px-6 py-6">
        <div className="mb-4 text-lg font-semibold tracking-tight">{signup ? "Sign up" : "Sign in"}</div>
        {signup && (
          <div className="mb-3.5 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label htmlFor="first-name" className="mb-1.5 block text-[13px] font-semibold">
                First name
              </label>
              <input id="first-name" type="text" placeholder="First name" autoComplete="given-name" className={inputClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div>
              <label htmlFor="last-name" className="mb-1.5 block text-[13px] font-semibold">
                Last name
              </label>
              <input id="last-name" type="text" placeholder="Last name" autoComplete="family-name" className={inputClass} value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
          </div>
        )}
        <div className="mb-3.5">
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass + (signup && error === "Email is already registered." ? " border-[#ed4245]" : "")}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
          />
          {error === "Email is already registered." && <div className="mt-1.5 text-sm text-[#ed4245]">{error}</div>}
        </div>
        <div className="mb-3.5">
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder={signup ? "Create password" : "Enter password"}
            autoComplete={signup ? "new-password" : "current-password"}
            className={inputClass + (error === "Incorrect password" ? " border-[#ed4245]" : "")}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
          {error === "Incorrect password" && <div className="mt-1.5 text-sm text-[#ed4245]">{error}</div>}
        </div>
        <Turnstile onToken={setToken} reset={reset} />
        {error === "Verification failed. Please try again." && <div className="mb-3.5 text-sm text-[#ed4245]">{error}</div>}
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-dark min-w-[96px] max-sm:w-full" disabled={!token} onClick={submit}>
            {signup ? "Sign up" : "Sign in"}
          </button>
        </div>
      </section>
      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        {signup ? "Already have an account? " : "No account? "}
        <Link to={signup ? "/signin" : "/signup"} className="font-semibold">
          {signup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </main>
  );
}
