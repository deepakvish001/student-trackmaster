import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, AlertOctagon, UserCheck, UserX, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Link } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

export { default } from './EnhancedDashboard';
