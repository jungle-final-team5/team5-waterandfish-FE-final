import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Learn from "./pages/Learn";
import Categories from "./pages/Categories";
import Chapters from "./pages/Chapters";
import Session from "./pages/Session";
import Review from "./pages/Review";
import SearchPage from "./pages/Search";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/home" element={<Home />} />
          <Route path="/learn" element={<Categories />} />
          <Route path="/learn/category/:categoryId" element={<Chapters />} />
          <Route path="/learn/session/:categoryId/:chapterId/:sessionType" element={<Session />} />
          <Route path="/learn/:keyword" element={<Learn />} />
          <Route path="/review" element={<Review />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;