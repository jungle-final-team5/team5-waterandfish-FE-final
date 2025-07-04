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
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import TestPage from "./pages/TestPage";
import { AuthProvider } from "@/hooks/useAuth";
import LetterSession from "./pages/Session_letter";
import LearningGuide from "./pages/LearningGuide";
import Quiz from "./pages/Quiz";
import QuizReview from "./pages/QuizReview";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/home" element={<Home />} />
            <Route path="/category" element={<Categories />} />
            <Route path="/category/:categoryId/chapters" element={<Chapters />} />
            <Route path="/learn/word/:wordId" element={<Learn />} />
            <Route path="/learn/chapter/:chapterId" element={<Session />} />
            <Route path="/learn/chapter/:chapterId/guide" element={<LearningGuide />} />
            <Route path="/quiz/chapter/:chapterId" element={<Quiz />} />
            <Route path="/quiz/chapter/:chapterId/review" element={<QuizReview />} />
            <Route path="/test/letter/:setType/:qOrs" element={<LetterSession />}/>
            <Route path="/review" element={<Review />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/Admin" element={<Admin />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;