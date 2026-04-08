import { BrowserRouter } from "react-router-dom"
import AppRoutes from "./AppRoutes"
import { PasswordChangeGate } from "@/components/auth/PasswordChangeGate"
import "./index.css"

function App() {
  return (
    <BrowserRouter>
      <PasswordChangeGate>
        <AppRoutes />
      </PasswordChangeGate>
    </BrowserRouter>
  )
}

export default App
