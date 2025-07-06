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
import WordSession from "./pages/WordSession";
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
import ProtectedRoute from "@/components/ProtectedRoute";
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
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/category" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/category/:categoryId/chapters" element={<ProtectedRoute><Chapters /></ProtectedRoute>} />
            <Route path="/learn/word/:word" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
            <Route path="/learn/chapter/:chapterId" element={<ProtectedRoute><Session /></ProtectedRoute>} />
            <Route path="/learn/chapter/:chapterId/guide" element={<ProtectedRoute><LearningGuide /></ProtectedRoute>} />
            <Route path="/quiz/chapter/:chapterId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/quiz/chapter/:chapterId/review" element={<ProtectedRoute><QuizReview /></ProtectedRoute>} />
            <Route path="/test/letter/:setType/:qOrs" element={<ProtectedRoute><LetterSession /></ProtectedRoute>}/>
            <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/Admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/test" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;